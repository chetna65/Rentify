import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError.js';
import { env } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  // 1. Explicit application HTTP errors
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // 2. Request validation errors (Zod) -> 400
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  // 3. MySQL 8 SQLSTATE 45000 trigger / signal errors -> 409
  // (e.g. "Invalid listing status transition", "audit_logs is append-only", "listings.id is immutable")
  if (err.sqlState === '45000' || err.errno === 1644) {
    return res.status(409).json({
      error: err.message || 'Action rejected by business rule trigger',
      code: 'TRIGGER_RULE_CONFLICT',
    });
  }

  // 4. MySQL Duplicate Key Error (ER_DUP_ENTRY, errno 1062) -> 409
  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return res.status(409).json({
      error: 'A record with these unique details already exists',
      code: 'DUPLICATE_ENTRY',
      ...(env.NODE_ENV !== 'production' ? { details: err.message } : {}),
    });
  }

  // 5. MySQL CHECK constraint violation (ER_CHECK_CONSTRAINT_VIOLATED, errno 3819) -> 400
  if (err.code === 'ER_CHECK_CONSTRAINT_VIOLATED' || err.errno === 3819) {
    return res.status(400).json({
      error: 'Submitted data violates database check constraint rules',
      code: 'CHECK_CONSTRAINT_VIOLATION',
      ...(env.NODE_ENV !== 'production' ? { details: err.message } : {}),
    });
  }

  // 6. MySQL Foreign Key violation (ER_NO_REFERENCED_ROW_2, ER_ROW_IS_REFERENCED_2, errno 1452/1451) -> 400
  if (
    err.code === 'ER_NO_REFERENCED_ROW_2' ||
    err.code === 'ER_ROW_IS_REFERENCED_2' ||
    err.errno === 1452 ||
    err.errno === 1451
  ) {
    return res.status(400).json({
      error: 'Referenced entity does not exist or violates foreign key constraints',
      code: 'FOREIGN_KEY_VIOLATION',
      ...(env.NODE_ENV !== 'production' ? { details: err.message } : {}),
    });
  }

  // Log server errors internally
  if (err.sql) {
    console.error('Database Query Error:', err.message, '\nSQL:', err.sql);
  } else {
    console.error('Internal Server Error:', err);
  }

  // 7. Unknown / unhandled errors -> 500 (no stack leaked in production)
  return res.status(500).json({
    error: 'Internal Server Error',
    ...(env.NODE_ENV !== 'production' ? { details: err.message, stack: err.stack } : {}),
  });
}

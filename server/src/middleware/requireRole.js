import { HttpError } from '../utils/httpError.js';

/**
 * Authorization middleware.
 * Guarantees that the authenticated user possesses one of the authorized roles.
 *
 * @param {...string} allowedRoles - List of permitted roles (e.g. 'admin', 'partner', 'vendor', 'customer')
 * @returns {import('express').RequestHandler}
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(HttpError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        HttpError.forbidden(
          `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}

import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 6;

const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        HttpError.badRequest(
          `Invalid file type '${file.mimetype}'. Only PDF, JPEG, and PNG files are allowed.`
        )
      );
    }
    cb(null, true);
  },
});

/**
 * Express middleware wrapping multer to capture MulterErrors and convert them into HttpErrors.
 */
export function handleUpload(req, res, next) {
  const uploadMiddleware = multerInstance.any();

  uploadMiddleware(req, res, (err) => {
    if (!err) {
      return next();
    }

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(HttpError.badRequest(`File too large. Maximum allowed file size is 5 MB.`));
      }
      if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(HttpError.badRequest(`Too many files. Maximum allowed is ${MAX_FILES} files.`));
      }
      return next(HttpError.badRequest(`File upload error: ${err.message}`));
    }

    if (err instanceof HttpError) {
      return next(err);
    }

    return next(HttpError.badRequest(err.message || 'Error uploading file'));
  });
}

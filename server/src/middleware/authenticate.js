import { getSessionUser } from '../services/auth.service.js';
import { HttpError } from '../utils/httpError.js';

export const AUTH_COOKIE_NAME = 'rentify_session';

/**
 * Authentication middleware.
 * Verifies the incoming session token (from HTTP-only cookie or Authorization Bearer header).
 * Populates req.user and req.session on success, or throws 401 Unauthorized.
 */
export async function authenticate(req, res, next) {
  try {
    // 1. Read token from cookie or Authorization header
    let rawToken = req.cookies?.[AUTH_COOKIE_NAME];
    if (!rawToken && req.headers.authorization?.startsWith('Bearer ')) {
      rawToken = req.headers.authorization.slice(7).trim();
    }

    if (!rawToken) {
      throw HttpError.unauthorized('Authentication required. No session token provided.');
    }

    // 2. Look up session & user in MySQL
    const sessionData = await getSessionUser(rawToken);
    if (!sessionData) {
      throw HttpError.unauthorized('Session is invalid, expired, or revoked. Please log in again.');
    }

    // 3. Attach to request
    req.user = sessionData.user;
    req.session = sessionData.session;
    req.rawToken = rawToken;

    next();
  } catch (error) {
    next(error);
  }
}

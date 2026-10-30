import { sendOtpSchema, verifyOtpSchema } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';
import { AUTH_COOKIE_NAME } from '../middleware/authenticate.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/',
  };
}

/**
 * POST /api/auth/send-otp
 */
export const sendOtp = asyncHandler(async (req, res) => {
  const { phone } = sendOtpSchema.parse(req.body);
  const result = await authService.sendOtp(phone);
  return res.status(200).json(result);
});

/**
 * POST /api/auth/verify-otp
 */
export const verifyOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = verifyOtpSchema.parse(req.body);
  const { rawToken, user, expiresAt } = await authService.verifyOtpAndCreateSession({
    rawPhone: phone,
    otp,
    ipAddress: req.ip || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });

  // Set HTTP-only secure session cookie
  res.cookie(AUTH_COOKIE_NAME, rawToken, getCookieOptions(expiresAt));

  return res.status(200).json({
    user,
    token: rawToken, // also returned in body for non-browser/cURL clients
  });
});

/**
 * GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const token = req.rawToken || req.cookies?.[AUTH_COOKIE_NAME];
  if (token) {
    await authService.logout(token);
  }

  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  return res.status(200).json({
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/admin-check
 * Demonstration route for role verification
 */
export const adminCheck = asyncHandler(async (req, res) => {
  return res.status(200).json({
    message: 'Admin access authorized',
    user: req.user,
  });
});

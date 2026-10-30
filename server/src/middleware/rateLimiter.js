import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for OTP dispatch.
 * Limits to 10 requests per 15 minutes per IP address / phone.
 */
export const sendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: (req) => {
    const phone = req.body?.phone ? String(req.body.phone).replace(/\D/g, '').slice(-10) : '';
    return `${req.ip}_${phone}`;
  },
  message: {
    error: 'Too many OTP requests from this connection. Please try again after 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for OTP verification.
 * Limits to 20 attempts per 15 minutes per IP address / phone.
 */
export const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  keyGenerator: (req) => {
    const phone = req.body?.phone ? String(req.body.phone).replace(/\D/g, '').slice(-10) : '';
    return `${req.ip}_${phone}`;
  },
  message: {
    error: 'Too many verification attempts. Please wait 15 minutes before trying again.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

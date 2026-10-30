import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/requireRole.js';
import { sendOtpLimiter, verifyOtpLimiter } from '../middleware/rateLimiter.js';

export const authRouter = Router();

authRouter.post('/auth/send-otp', sendOtpLimiter, authController.sendOtp);
authRouter.post('/auth/verify-otp', verifyOtpLimiter, authController.verifyOtp);
authRouter.get('/auth/me', authenticate, authController.getMe);
authRouter.post('/auth/logout', authenticate, authController.logout);

// Protected route demonstration
authRouter.get('/auth/admin-check', authenticate, requireRole('admin'), authController.adminCheck);

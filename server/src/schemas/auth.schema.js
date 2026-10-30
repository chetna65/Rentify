import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone number is required' }).min(1, 'Phone number is required'),
});

export const verifyOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone number is required' }).min(1, 'Phone number is required'),
  otp: z.string({ required_error: 'OTP code is required' }).trim().min(1, 'OTP code is required'),
});

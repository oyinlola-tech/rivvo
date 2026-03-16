import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import {
  login,
  signup,
  verifyOtp,
  resendOtp,
  requestPasswordReset,
  resetPassword,
  refresh,
  logout
} from '../controllers/authController.js';

const router = Router();

router.post('/login', authRateLimiter, asyncHandler(login));
router.post('/signup', authRateLimiter, asyncHandler(signup));
router.post('/verify-otp', authRateLimiter, asyncHandler(verifyOtp));
router.post('/resend-otp', authRateLimiter, asyncHandler(resendOtp));
router.post('/password/forgot', authRateLimiter, asyncHandler(requestPasswordReset));
router.post('/password/reset', authRateLimiter, asyncHandler(resetPassword));
router.post('/refresh', authRateLimiter, asyncHandler(refresh));
router.post('/logout', authRateLimiter, asyncHandler(logout));

export default router;

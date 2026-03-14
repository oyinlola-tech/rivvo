import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  getVerificationPricing,
  getVerificationEligibility,
  createVerificationCheckout,
  confirmVerificationPayment,
  handleVerificationWebhook
} from '../controllers/verificationController.js';

const router = Router();

router.get('/pricing', asyncHandler(getVerificationPricing));
router.get('/eligibility', auth, asyncHandler(getVerificationEligibility));
router.post('/checkout', auth, asyncHandler(createVerificationCheckout));
router.post('/confirm', auth, asyncHandler(confirmVerificationPayment));
router.post('/webhook', asyncHandler(handleVerificationWebhook));

export default router;

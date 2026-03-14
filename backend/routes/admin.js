import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import admin from '../middleware/admin.js';
import {
  getUsers,
  deleteUser,
  updateVerification,
  getReports,
  resolveReport,
  assignReport,
  updateUserStatus,
  getReportMessagesAdmin,
  getAnalytics,
  getModerators,
  createModerator,
  getVerificationPricing,
  setVerificationPricing,
  getVerificationPayments,
  reviewVerificationPayment,
  updateVerificationBadge
} from '../controllers/adminController.js';

const router = Router();

router.use(auth, admin);

router.get('/users', asyncHandler(getUsers));
router.delete('/users/:userId', asyncHandler(deleteUser));
router.put('/users/:userId/verification', asyncHandler(updateVerification));
router.get('/reports', asyncHandler(getReports));
router.post('/reports/:reportId/resolve', asyncHandler(resolveReport));
router.post('/reports/:reportId/assign', asyncHandler(assignReport));
router.get('/reports/:reportId/messages', asyncHandler(getReportMessagesAdmin));
router.get('/analytics', asyncHandler(getAnalytics));
router.get('/moderators', asyncHandler(getModerators));
router.post('/moderators', asyncHandler(createModerator));
router.put('/users/:userId/status', asyncHandler(updateUserStatus));
router.get('/verification/pricing', asyncHandler(getVerificationPricing));
router.put('/verification/pricing', asyncHandler(setVerificationPricing));
router.get('/verification/payments', asyncHandler(getVerificationPayments));
router.post('/verification/payments/:paymentId/review', asyncHandler(reviewVerificationPayment));
router.put('/users/:userId/verification-badge', asyncHandler(updateVerificationBadge));

export default router;

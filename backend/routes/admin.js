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
  getAnalytics,
  getModerators,
  createModerator
} from '../controllers/adminController.js';

const router = Router();

router.use(auth, admin);

router.get('/users', asyncHandler(getUsers));
router.delete('/users/:userId', asyncHandler(deleteUser));
router.put('/users/:userId/verification', asyncHandler(updateVerification));
router.get('/reports', asyncHandler(getReports));
router.post('/reports/:reportId/resolve', asyncHandler(resolveReport));
router.get('/analytics', asyncHandler(getAnalytics));
router.get('/moderators', asyncHandler(getModerators));
router.post('/moderators', asyncHandler(createModerator));

export default router;

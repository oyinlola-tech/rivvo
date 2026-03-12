import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import moderator from '../middleware/moderator.js';
import {
  getAssignedReports,
  getReportMessages,
  resolveAssignedReport
} from '../controllers/moderationController.js';

const router = Router();

router.use(auth, moderator);
router.get('/reports', asyncHandler(getAssignedReports));
router.get('/reports/:reportId/messages', asyncHandler(getReportMessages));
router.post('/reports/:reportId/resolve', asyncHandler(resolveAssignedReport));

export default router;

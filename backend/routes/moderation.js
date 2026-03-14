import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import moderator from '../middleware/moderator.js';
import {
  getAssignedReports,
  getUnassignedReports,
  getReportMessages,
  resolveAssignedReport,
  getModerators,
  assignReport,
  updateUserStatus,
  getAuditLogs,
  getAllBlocks,
  searchUsers
} from '../controllers/moderationController.js';

const router = Router();

router.use(auth, moderator);
router.get('/reports', asyncHandler(getAssignedReports));
router.get('/reports/unassigned', asyncHandler(getUnassignedReports));
router.get('/reports/:reportId/messages', asyncHandler(getReportMessages));
router.post('/reports/:reportId/resolve', asyncHandler(resolveAssignedReport));
router.post('/reports/:reportId/assign', asyncHandler(assignReport));
router.get('/moderators', asyncHandler(getModerators));
router.put('/users/:userId/status', asyncHandler(updateUserStatus));
router.get('/audit-logs', asyncHandler(getAuditLogs));
router.get('/blocks', asyncHandler(getAllBlocks));
router.get('/users/search', asyncHandler(searchUsers));

export default router;

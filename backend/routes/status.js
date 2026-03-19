import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import {
  createStatus,
  getStatuses,
  getMyStatuses,
  deleteStatus,
  getStatusViews,
  markStatusViewed,
  muteStatusUser,
  unmuteStatusUser
} from '../controllers/statusController.js';
import { upload } from '../utils/upload.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', auth, asyncHandler(getStatuses));
router.get('/me', auth, asyncHandler(getMyStatuses));
router.post('/', auth, uploadRateLimiter, (req, res, next) => {
  req.uploadFolder = 'uploads/status';
  next();
}, upload.single('media'), asyncHandler(createStatus));
router.delete('/:statusId', auth, asyncHandler(deleteStatus));
router.get('/:statusId/views', auth, asyncHandler(getStatusViews));
router.post('/:statusId/view', auth, asyncHandler(markStatusViewed));
router.post('/mute', auth, asyncHandler(muteStatusUser));
router.delete('/mute/:mutedUserId', auth, asyncHandler(unmuteStatusUser));

export default router;

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
import { validateFileSignature, safeUnlink } from '../utils/fileSignature.js';
import { uploadRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', auth, asyncHandler(getStatuses));
router.get('/me', auth, asyncHandler(getMyStatuses));
router.post('/', auth, uploadRateLimiter, (req, res, next) => {
  req.uploadFolder = 'uploads/status';
  next();
}, upload.single('media'), asyncHandler(async (req, res, next) => {
  if (req.file) {
    const result = await validateFileSignature(req.file.path, 'imageOrVideo');
    if (!result.ok) {
      await safeUnlink(req.file.path);
      return res.status(400).json({ message: 'Invalid media file' });
    }
  }
  return next();
}), asyncHandler(createStatus));
router.delete('/:statusId', auth, asyncHandler(deleteStatus));
router.get('/:statusId/views', auth, asyncHandler(getStatusViews));
router.post('/:statusId/view', auth, asyncHandler(markStatusViewed));
router.post('/mute', auth, asyncHandler(muteStatusUser));
router.delete('/mute/:mutedUserId', auth, asyncHandler(unmuteStatusUser));

export default router;

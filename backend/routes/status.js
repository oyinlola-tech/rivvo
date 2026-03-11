import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { createStatus, getStatuses } from '../controllers/statusController.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/', auth, asyncHandler(getStatuses));
router.post('/', auth, (req, res, next) => {
  req.uploadFolder = 'uploads/status';
  next();
}, upload.single('media'), asyncHandler(createStatus));

export default router;

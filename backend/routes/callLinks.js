import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { createCallLink, resolveCallLink } from '../controllers/callLinksController.js';

const router = Router();

router.get('/:token', asyncHandler(resolveCallLink));
router.post('/', auth, asyncHandler(createCallLink));

export default router;

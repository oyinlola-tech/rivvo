import { Router } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import auth from '../middleware/auth.js';
import { createUserInvite, resolveUserInvite, resolveGroupInvite } from '../controllers/invitesController.js';

const router = Router();

router.get('/users/:token', asyncHandler(resolveUserInvite));
router.get('/groups/:token', asyncHandler(resolveGroupInvite));

router.use(auth);
router.post('/users', asyncHandler(createUserInvite));

export default router;

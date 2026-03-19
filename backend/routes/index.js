import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import messageRoutes from './messages.js';
import callRoutes from './calls.js';
import contactRoutes from './contacts.js';
import adminRoutes from './admin.js';
import reportRoutes from './reports.js';
import blockRoutes from './blocks.js';
import moderationRoutes from './moderation.js';
import groupRoutes from './groups.js';
import inviteRoutes from './invites.js';
import callLinkRoutes from './callLinks.js';
import statusRoutes from './status.js';
import verificationRoutes from './verification.js';
import supportRoutes from './support.js';
import notificationsRoutes from './notifications.js';
import { apiRateLimiter, messageRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', apiRateLimiter, userRoutes);
router.use('/messages', apiRateLimiter, messageRoutes);
router.use('/calls', apiRateLimiter, callRoutes);
router.use('/contacts', apiRateLimiter, contactRoutes);
router.use('/status', apiRateLimiter, statusRoutes);
router.use('/notifications', apiRateLimiter, notificationsRoutes);
router.use('/admin', apiRateLimiter, adminRoutes);
router.use('/reports', apiRateLimiter, reportRoutes);
router.use('/blocks', apiRateLimiter, blockRoutes);
router.use('/moderation', apiRateLimiter, moderationRoutes);
router.use('/groups', apiRateLimiter, groupRoutes);
router.use('/invites', apiRateLimiter, inviteRoutes);
router.use('/call-links', apiRateLimiter, callLinkRoutes);
router.use('/verification', apiRateLimiter, verificationRoutes);
router.use('/support', apiRateLimiter, supportRoutes);

export default router;

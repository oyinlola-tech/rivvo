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

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/calls', callRoutes);
router.use('/contacts', contactRoutes);
router.use('/status', statusRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/admin', adminRoutes);
router.use('/reports', reportRoutes);
router.use('/blocks', blockRoutes);
router.use('/moderation', moderationRoutes);
router.use('/groups', groupRoutes);
router.use('/invites', inviteRoutes);
router.use('/call-links', callLinkRoutes);
router.use('/verification', verificationRoutes);
router.use('/support', supportRoutes);

export default router;

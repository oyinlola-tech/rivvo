import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import messageRoutes from './messages.js';
import callRoutes from './calls.js';
import contactRoutes from './contacts.js';
import adminRoutes from './admin.js';
import statusRoutes from './status.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/messages', messageRoutes);
router.use('/calls', callRoutes);
router.use('/contacts', contactRoutes);
router.use('/status', statusRoutes);
router.use('/admin', adminRoutes);

export default router;

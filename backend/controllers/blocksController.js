import pool from '../config/db.js';
import { sendError, requireFields } from '../utils/validation.js';

export const blockUser = async (req, res) => {
  const userId = req.user?.id;
  const { blockedUserId } = req.body || {};
  const missing = requireFields(req.body, ['blockedUserId']);
  if (missing.length) {
    return sendError(res, 400, 'blockedUserId is required');
  }
  if (blockedUserId === userId) {
    return sendError(res, 400, 'You cannot block yourself');
  }

  await pool.execute(
    `INSERT IGNORE INTO blocks (blocker_id, blocked_id)
     VALUES (:blocker_id, :blocked_id)`,
    { blocker_id: userId, blocked_id: blockedUserId }
  );

  return res.status(201).json({ message: 'User blocked' });
};

export const unblockUser = async (req, res) => {
  const userId = req.user?.id;
  const { blockedUserId } = req.params;
  if (!blockedUserId) {
    return sendError(res, 400, 'blockedUserId is required');
  }

  await pool.execute(
    `DELETE FROM blocks
     WHERE blocker_id = :blocker_id AND blocked_id = :blocked_id`,
    { blocker_id: userId, blocked_id: blockedUserId }
  );

  return res.json({ message: 'User unblocked' });
};

export const getBlockedUsers = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar
     FROM blocks b
     JOIN users u ON u.id = b.blocked_id
     WHERE b.blocker_id = :blocker_id
     ORDER BY b.created_at DESC`,
    { blocker_id: userId }
  );

  const blocked = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    avatar: row.avatar || null
  }));

  return res.json(blocked);
};

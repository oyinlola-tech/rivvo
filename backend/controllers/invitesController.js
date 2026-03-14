import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError } from '../utils/validation.js';

export const createUserInvite = async (req, res) => {
  const userId = req.user?.id;
  const token = uuid().replace(/-/g, '');
  await pool.execute(
    `INSERT INTO user_invites (id, user_id, token)
     VALUES (:id, :user_id, :token)`,
    { id: uuid(), user_id: userId, token }
  );
  return res.status(201).json({ token });
};

export const resolveUserInvite = async (req, res) => {
  const { token } = req.params;
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.avatar, u.verified,
            CASE
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW()
              THEN 1 ELSE 0
            END AS is_verified_badge_active,
            CASE
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 'active'
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at <= NOW() THEN 'expired'
              ELSE 'none'
            END AS badge_status,
            u.is_moderator, u.is_admin
     FROM user_invites ui
     JOIN users u ON u.id = ui.user_id
     WHERE ui.token = :token
     LIMIT 1`,
    { token }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Invite not found');
  }
  const user = rows[0];
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    verified: Boolean(user.verified),
    isVerifiedBadge: Boolean(user.is_verified_badge_active),
    badgeStatus: user.badge_status,
    isModerator: Boolean(user.is_moderator),
    isAdmin: Boolean(user.is_admin)
  });
};

export const resolveGroupInvite = async (req, res) => {
  const { token } = req.params;
  const [rows] = await pool.execute(
    `SELECT g.id, g.name, g.description, g.is_private
     FROM group_invites gi
     JOIN groups g ON g.id = gi.group_id
     WHERE gi.token = :token
     LIMIT 1`,
    { token }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Invite not found');
  }
  const group = rows[0];
  return res.json({
    id: group.id,
    name: group.name,
    description: group.description,
    isPrivate: Boolean(group.is_private)
  });
};

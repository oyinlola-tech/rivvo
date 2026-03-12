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
    `SELECT u.id, u.name, u.email, u.avatar, u.verified, u.is_moderator
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
    isModerator: Boolean(user.is_moderator)
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

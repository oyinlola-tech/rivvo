import pool from '../config/db.js';
import { isUserOnline } from '../services/presenceService.js';
import { sendError, requireFields } from '../utils/validation.js';

export const getContacts = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.avatar, u.verified, u.is_moderator
     FROM contacts c
     JOIN users u ON u.id = c.contact_id
     WHERE c.user_id = :user_id
     ORDER BY u.name ASC`,
    { user_id: userId }
  );

  const contacts = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    avatar: row.avatar || null,
    online: isUserOnline(row.id),
    verified: Boolean(row.verified),
    isModerator: Boolean(row.is_moderator)
  }));

  return res.json(contacts);
};

export const addContact = async (req, res) => {
  const userId = req.user?.id;
  const { userId: contactId } = req.body || {};

  const missing = requireFields(req.body, ['userId']);
  if (missing.length) {
    return sendError(res, 400, 'userId is required');
  }

  const [userRows] = await pool.execute('SELECT id FROM users WHERE id = :id', { id: contactId });
  if (!userRows.length) {
    return sendError(res, 404, 'User not found');
  }

  await pool.execute(
    `INSERT IGNORE INTO contacts (user_id, contact_id)
     VALUES (:user_id, :contact_id)`,
    { user_id: userId, contact_id: contactId }
  );

  return res.status(201).json({ message: 'Contact added successfully' });
};

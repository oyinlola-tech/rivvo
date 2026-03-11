import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';

export const getStatuses = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT
        s.id,
        s.user_id,
        s.text,
        s.media_url,
        s.media_type,
        s.created_at,
        s.expires_at,
        u.name,
        u.avatar,
        u.verified,
        u.is_moderator
     FROM statuses s
     JOIN users u ON u.id = s.user_id
     WHERE s.expires_at > NOW()
       AND (
         s.user_id = :user_id OR
         s.user_id IN (SELECT contact_id FROM contacts WHERE user_id = :user_id)
       )
     ORDER BY s.created_at DESC`,
    { user_id: userId }
  );

  const grouped = new Map();
  rows.forEach((row) => {
    if (!grouped.has(row.user_id)) {
      grouped.set(row.user_id, {
        user: {
          id: row.user_id,
          name: row.name,
          avatar: row.avatar || null,
          verified: Boolean(row.verified),
          isModerator: Boolean(row.is_moderator)
        },
        statuses: []
      });
    }
    grouped.get(row.user_id).statuses.push({
      id: row.id,
      text: row.text,
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      createdAt: new Date(row.created_at).toISOString(),
      expiresAt: new Date(row.expires_at).toISOString()
    });
  });

  return res.json(Array.from(grouped.values()));
};

export const createStatus = async (req, res) => {
  const userId = req.user?.id;
  const { text } = req.body || {};
  const file = req.file;

  if (!text && !file) {
    return res.status(400).json({ error: 'Bad Request', message: 'Text or media is required' });
  }

  const statusId = uuid();
  const mediaUrl = file ? `/uploads/status/${file.filename}` : null;
  const mediaType = file ? file.mimetype : null;

  await pool.execute(
    `INSERT INTO statuses (id, user_id, text, media_url, media_type, expires_at)
     VALUES (:id, :user_id, :text, :media_url, :media_type, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
    {
      id: statusId,
      user_id: userId,
      text: text || null,
      media_url: mediaUrl,
      media_type: mediaType
    }
  );

  return res.status(201).json({
    id: statusId,
    text: text || null,
    mediaUrl,
    mediaType,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
};

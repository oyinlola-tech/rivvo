import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError } from '../utils/validation.js';

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
        sv.viewed_at,
        (
          SELECT COUNT(*) FROM status_views sv2 WHERE sv2.status_id = s.id
        ) AS view_count,
        u.name,
        u.avatar,
        u.verified,
        CASE
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW()
          THEN 1 ELSE 0
        END AS is_verified_badge_active,
        CASE
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 'active'
          WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at <= NOW() THEN 'expired'
          ELSE 'none'
        END AS badge_status,
        u.is_moderator,
        u.is_admin
     FROM statuses s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN status_views sv
       ON sv.status_id = s.id AND sv.viewer_id = :user_id
     LEFT JOIN status_mutes sm
       ON sm.user_id = :user_id AND sm.muted_user_id = s.user_id
     WHERE s.expires_at > NOW()
       AND sm.muted_user_id IS NULL
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
          isVerifiedBadge: Boolean(row.is_verified_badge_active),
          badgeStatus: row.badge_status,
          isModerator: Boolean(row.is_moderator),
          isAdmin: Boolean(row.is_admin)
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
      expiresAt: new Date(row.expires_at).toISOString(),
      viewedAt: row.viewed_at ? new Date(row.viewed_at).toISOString() : null,
      viewCount: Number(row.view_count || 0)
    });
  });

  const unviewed = [];
  const viewed = [];
  for (const group of grouped.values()) {
    const isSelf = group.user.id === userId;
    const allViewed = isSelf
      ? true
      : group.statuses.every((status) => Boolean(status.viewedAt));
    if (allViewed) {
      viewed.push(group);
    } else {
      unviewed.push(group);
    }
  }

  const [mutedRows] = await pool.execute(
    `SELECT u.id, u.name, u.avatar
     FROM status_mutes sm
     JOIN users u ON u.id = sm.muted_user_id
     WHERE sm.user_id = :user_id
     ORDER BY u.name ASC`,
    { user_id: userId }
  );
  const muted = mutedRows.map((row) => ({
    id: row.id,
    name: row.name,
    avatar: row.avatar || null
  }));

  return res.json({ unviewed, viewed, muted });
};

export const createStatus = async (req, res) => {
  const userId = req.user?.id;
  const { text, type, content, caption, backgroundColor } = req.body || {};
  const file = req.file;

  const normalizedType = typeof type === 'string' ? type.toLowerCase() : null;
  const isTextStatus = normalizedType === 'text';
  const contentValue = typeof content === 'string' ? content.trim() : '';
  const isAllowedUrl = (value) =>
    value.startsWith('/uploads/') ||
    value.startsWith('https://') ||
    value.startsWith('http://');
  const isValidColor = (value) =>
    /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ||
    /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(value) ||
    /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/i.test(value);

  if (!text && !file && !contentValue) {
    return res.status(400).json({ error: 'Bad Request', message: 'Text or media is required' });
  }
  if (!file && !isTextStatus && contentValue && !isAllowedUrl(contentValue)) {
    return res.status(400).json({ error: 'Bad Request', message: 'Invalid media URL' });
  }

  const statusId = uuid();
  const mediaUrl = file
    ? `/uploads/status/${file.filename}`
    : !isTextStatus && contentValue
      ? contentValue
      : null;
  const mediaType = file
    ? file.mimetype
    : !isTextStatus && contentValue
      ? normalizedType === 'video'
        ? 'video/mp4'
        : 'image/jpeg'
      : null;
  const textValue = isTextStatus ? contentValue : text;

  await pool.execute(
    `INSERT INTO statuses (id, user_id, text, media_url, media_type, expires_at)
     VALUES (:id, :user_id, :text, :media_url, :media_type, DATE_ADD(NOW(), INTERVAL 1 DAY))`,
    {
      id: statusId,
      user_id: userId,
      text: textValue || null,
      media_url: mediaUrl,
      media_type: mediaType
    }
  );

  const safeBackground = typeof backgroundColor === 'string' && isValidColor(backgroundColor)
    ? backgroundColor
    : null;

  return res.status(201).json({
    id: statusId,
    text: textValue || null,
    mediaUrl,
    mediaType,
    caption: caption || null,
    backgroundColor: safeBackground,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  });
};

export const getMyStatuses = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT s.id, s.text, s.media_url, s.media_type, s.created_at, s.expires_at,
            COUNT(sv.id) AS view_count,
            u.name, u.avatar
     FROM statuses s
     JOIN users u ON u.id = s.user_id
     LEFT JOIN status_views sv ON sv.status_id = s.id
     WHERE s.user_id = :user_id AND s.expires_at > NOW()
     GROUP BY s.id
     ORDER BY s.created_at DESC`,
    { user_id: userId }
  );

  const statuses = rows.map((row) => ({
    id: row.id,
    userId,
    userName: row.name,
    userAvatar: row.avatar || null,
    type: row.media_type
      ? row.media_type.startsWith('video')
        ? 'video'
        : 'image'
      : 'text',
    content: row.media_url || row.text || '',
    backgroundColor: row.media_type ? null : '#0f172a',
    caption: null,
    viewCount: Number(row.view_count || 0),
    createdAt: new Date(row.created_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    viewed: true
  }));

  return res.json(statuses);
};

export const deleteStatus = async (req, res) => {
  const userId = req.user?.id;
  const { statusId } = req.params;
  if (!statusId) {
    return sendError(res, 400, 'statusId is required');
  }

  const [rows] = await pool.execute(
    `SELECT id FROM statuses WHERE id = :id AND user_id = :user_id LIMIT 1`,
    { id: statusId, user_id: userId }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Status not found');
  }

  await pool.execute(`DELETE FROM statuses WHERE id = :id`, { id: statusId });
  return res.json({ message: 'Status deleted' });
};

export const getStatusViews = async (req, res) => {
  const userId = req.user?.id;
  const { statusId } = req.params;
  if (!statusId) {
    return sendError(res, 400, 'statusId is required');
  }

  const [owns] = await pool.execute(
    `SELECT id FROM statuses WHERE id = :id AND user_id = :user_id LIMIT 1`,
    { id: statusId, user_id: userId }
  );
  if (!owns.length) {
    return sendError(res, 404, 'Status not found');
  }

  const [rows] = await pool.execute(
    `SELECT sv.id, sv.viewer_id, sv.viewed_at, u.name, u.avatar
     FROM status_views sv
     JOIN users u ON u.id = sv.viewer_id
     WHERE sv.status_id = :status_id
     ORDER BY sv.viewed_at DESC`,
    { status_id: statusId }
  );

  const views = rows.map((row) => ({
    id: row.id,
    statusId,
    viewerId: row.viewer_id,
    viewerName: row.name,
    viewerAvatar: row.avatar || null,
    viewedAt: row.viewed_at ? new Date(row.viewed_at).toISOString() : null
  }));

  return res.json(views);
};

export const markStatusViewed = async (req, res) => {
  const userId = req.user?.id;
  const { statusId } = req.params;
  if (!statusId) {
    return sendError(res, 400, 'statusId is required');
  }

  const [rows] = await pool.execute(
    `SELECT id FROM statuses WHERE id = :id AND expires_at > NOW() LIMIT 1`,
    { id: statusId }
  );
  if (!rows.length) {
    return sendError(res, 404, 'Status not found');
  }

  await pool.execute(
    `INSERT INTO status_views (id, status_id, viewer_id, viewed_at)
     VALUES (:id, :status_id, :viewer_id, NOW())
     ON DUPLICATE KEY UPDATE viewed_at = VALUES(viewed_at)`,
    { id: uuid(), status_id: statusId, viewer_id: userId }
  );

  return res.json({ message: 'Status viewed' });
};

export const muteStatusUser = async (req, res) => {
  const userId = req.user?.id;
  const { mutedUserId } = req.body || {};
  if (!mutedUserId) {
    return sendError(res, 400, 'mutedUserId is required');
  }
  if (mutedUserId === userId) {
    return sendError(res, 400, 'You cannot mute yourself');
  }

  await pool.execute(
    `INSERT IGNORE INTO status_mutes (id, user_id, muted_user_id)
     VALUES (:id, :user_id, :muted_user_id)`,
    { id: uuid(), user_id: userId, muted_user_id: mutedUserId }
  );
  return res.json({ message: 'User muted' });
};

export const unmuteStatusUser = async (req, res) => {
  const userId = req.user?.id;
  const { mutedUserId } = req.params;
  if (!mutedUserId) {
    return sendError(res, 400, 'mutedUserId is required');
  }

  await pool.execute(
    `DELETE FROM status_mutes
     WHERE user_id = :user_id AND muted_user_id = :muted_user_id`,
    { user_id: userId, muted_user_id: mutedUserId }
  );
  return res.json({ message: 'User unmuted' });
};

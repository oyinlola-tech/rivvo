import pool from '../config/db.js';
import { sendError } from '../utils/validation.js';

export const getAssignedReports = async (req, res) => {
  const moderatorId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT
        r.id,
        r.reason,
        r.description,
        r.status,
        r.type,
        r.reported_message_id,
        r.conversation_id,
        r.created_at,
        ru.name AS reported_name,
        ru.email AS reported_email,
        rb.name AS reporter_name,
        rb.email AS reporter_email
     FROM reports r
     JOIN users ru ON ru.id = r.reported_user_id
     JOIN users rb ON rb.id = r.reported_by_id
     WHERE r.assigned_moderator_id = :moderator_id
     ORDER BY r.created_at DESC`,
    { moderator_id: moderatorId }
  );

  const reports = rows.map((row) => ({
    id: row.id,
    reportedUser: {
      name: row.reported_name,
      email: row.reported_email
    },
    reportedBy: {
      name: row.reporter_name,
      email: row.reporter_email
    },
    reason: row.reason,
    description: row.description,
    status: row.status,
    type: row.type,
    reportedMessageId: row.reported_message_id,
    conversationId: row.conversation_id,
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(reports);
};

export const getUnassignedReports = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
        r.id,
        r.reason,
        r.description,
        r.status,
        r.type,
        r.reported_message_id,
        r.conversation_id,
        r.created_at,
        ru.id AS reported_id,
        ru.name AS reported_name,
        ru.email AS reported_email,
        rb.id AS reporter_id,
        rb.name AS reporter_name,
        rb.email AS reporter_email
     FROM reports r
     JOIN users ru ON ru.id = r.reported_user_id
     JOIN users rb ON rb.id = r.reported_by_id
     WHERE r.assigned_moderator_id IS NULL
     ORDER BY r.created_at DESC`
  );

  const reports = rows.map((row) => ({
    id: row.id,
    reportedUser: {
      id: row.reported_id,
      name: row.reported_name,
      email: row.reported_email
    },
    reportedBy: {
      id: row.reporter_id,
      name: row.reporter_name,
      email: row.reporter_email
    },
    reason: row.reason,
    description: row.description,
    status: row.status,
    type: row.type,
    reportedMessageId: row.reported_message_id,
    conversationId: row.conversation_id,
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(reports);
};

export const getReportMessages = async (req, res) => {
  const { reportId } = req.params;
  if (!reportId) {
    return sendError(res, 400, 'reportId is required');
  }

  const [rows] = await pool.execute(
    `SELECT rm.message_id, rm.sender_id, rm.body, rm.iv, rm.is_encrypted, rm.created_at, u.name
     FROM report_messages rm
     LEFT JOIN users u ON u.id = rm.sender_id
     WHERE rm.report_id = :report_id
     ORDER BY rm.created_at DESC`,
    { report_id: reportId }
  );

  const messages = rows.map((row) => ({
    id: row.message_id,
    senderId: row.sender_id,
    senderName: row.name || 'Unknown',
    body: row.body,
    iv: row.iv || null,
    encrypted: Boolean(row.is_encrypted),
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(messages);
};

export const getModerators = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email
     FROM users
     WHERE is_moderator = 1
     ORDER BY created_at DESC`
  );

  const moderators = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email
  }));

  return res.json(moderators);
};

export const assignReport = async (req, res) => {
  const { reportId } = req.params;
  const { moderatorId } = req.body || {};
  if (!moderatorId) {
    return sendError(res, 400, 'moderatorId is required');
  }

  const [rows] = await pool.execute(
    `SELECT id FROM users WHERE id = :id AND is_moderator = 1 LIMIT 1`,
    { id: moderatorId }
  );
  if (!rows.length) {
    return sendError(res, 400, 'Moderator not found');
  }

  await pool.execute(
    `UPDATE reports
     SET assigned_moderator_id = :moderator_id
     WHERE id = :id`,
    { id: reportId, moderator_id: moderatorId }
  );

  return res.json({ message: 'Report assigned' });
};

export const updateUserStatus = async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body || {};
  if (!userId) {
    return sendError(res, 400, 'userId is required');
  }
  if (status !== 'active' && status !== 'suspended') {
    return sendError(res, 400, 'status must be active or suspended');
  }

  await pool.execute('UPDATE users SET status = :status WHERE id = :id', {
    id: userId,
    status
  });
  if (status === 'suspended') {
    await pool.execute(
      `UPDATE users
       SET token_version = token_version + 1
       WHERE id = :id`,
      { id: userId }
    );
    await pool.execute(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE user_id = :id AND revoked_at IS NULL`,
      { id: userId }
    );
  }

  return res.json({ message: 'User status updated' });
};

export const resolveAssignedReport = async (req, res) => {
  const { reportId } = req.params;
  const moderatorId = req.user?.id;
  if (!reportId) {
    return sendError(res, 400, 'reportId is required');
  }

  await pool.execute(
    `UPDATE reports
     SET status = 'resolved',
         resolved_by_id = :resolved_by_id,
         resolved_at = NOW()
     WHERE id = :id AND assigned_moderator_id = :moderator_id`,
    { id: reportId, moderator_id: moderatorId, resolved_by_id: moderatorId }
  );

  return res.json({ message: 'Report resolved' });
};

export const getAuditLogs = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT l.id, l.action, l.target_id, l.metadata, l.created_at, u.name AS admin_name, u.email AS admin_email
     FROM admin_audit_logs l
     LEFT JOIN users u ON u.id = l.admin_id
     ORDER BY l.created_at DESC
     LIMIT 200`
  );

  const logs = rows.map((row) => ({
    id: row.id,
    action: row.action,
    targetId: row.target_id,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
    createdAt: new Date(row.created_at).toISOString(),
    admin: {
      name: row.admin_name || 'Unknown',
      email: row.admin_email || ''
    }
  }));

  return res.json(logs);
};

export const getAllBlocks = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT b.blocker_id, b.blocked_id, b.created_at,
            ub.name AS blocker_name, ub.email AS blocker_email,
            ud.name AS blocked_name, ud.email AS blocked_email
     FROM blocks b
     JOIN users ub ON ub.id = b.blocker_id
     JOIN users ud ON ud.id = b.blocked_id
     ORDER BY b.created_at DESC
     LIMIT 200`
  );

  const blocks = rows.map((row) => ({
    blocker: { id: row.blocker_id, name: row.blocker_name, email: row.blocker_email },
    blocked: { id: row.blocked_id, name: row.blocked_name, email: row.blocked_email },
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(blocks);
};

export const searchUsers = async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!query) {
    return sendError(res, 400, 'Search query required');
  }

  const [rows] = await pool.execute(
    `SELECT id, name, email, phone, verified, is_moderator, is_admin, status,
            CASE
              WHEN is_verified_badge = 1 AND verified_badge_expires_at > NOW() THEN 'active'
              WHEN is_verified_badge = 1 AND verified_badge_expires_at <= NOW() THEN 'expired'
              ELSE 'none'
            END AS badge_status,
            CASE
              WHEN is_verified_badge = 1 AND verified_badge_expires_at > NOW() THEN 1 ELSE 0
            END AS is_verified_badge_active
     FROM users
     WHERE name LIKE :query OR email LIKE :query OR phone LIKE :query
     ORDER BY created_at DESC
     LIMIT 50`,
    { query: `%${query}%` }
  );

  const users = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    verified: Boolean(row.verified),
    isVerifiedBadge: Boolean(row.is_verified_badge_active),
    badgeStatus: row.badge_status,
    isModerator: Boolean(row.is_moderator),
    isAdmin: Boolean(row.is_admin),
    status: row.status
  }));

  return res.json(users);
};

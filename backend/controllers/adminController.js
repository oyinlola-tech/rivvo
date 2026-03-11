import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError, requireFields, isEmail, isNonEmptyString } from '../utils/validation.js';

const mapUserRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  verified: Boolean(row.verified),
  isModerator: Boolean(row.is_moderator),
  createdAt: new Date(row.created_at).toISOString(),
  status: row.status
});

const logAdminAction = async (adminId, action, targetId, metadata) => {
  try {
    await pool.execute(
      `INSERT INTO admin_audit_logs (id, admin_id, action, target_id, metadata)
       VALUES (:id, :admin_id, :action, :target_id, :metadata)`,
      {
        id: uuid(),
        admin_id: adminId,
        action,
        target_id: targetId || null,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    );
  } catch (error) {
    // Audit failures should not block admin actions.
  }
};

export const getUsers = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const offset = (page - 1) * limit;

  const [[countRow]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [rows] = await pool.execute(
    `SELECT id, name, email, verified, is_moderator, created_at, status
     FROM users
     ORDER BY created_at DESC
     LIMIT :limit OFFSET :offset`,
    { limit, offset }
  );

  const total = countRow.total || 0;
  const totalPages = Math.ceil(total / limit);

  return res.json({
    users: rows.map(mapUserRow),
    total,
    page,
    totalPages
  });
};

export const deleteUser = async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return sendError(res, 400, 'userId is required');
  }
  await pool.execute('DELETE FROM users WHERE id = :id', { id: userId });
  await logAdminAction(req.user?.id, 'delete_user', userId, null);
  return res.json({ message: 'User deleted successfully' });
};

export const updateVerification = async (req, res) => {
  const { userId } = req.params;
  const { verified } = req.body || {};

  if (verified === undefined) {
    return sendError(res, 400, 'verified is required');
  }

  await pool.execute('UPDATE users SET verified = :verified WHERE id = :id', {
    id: userId,
    verified: verified ? 1 : 0
  });

  await logAdminAction(req.user?.id, 'update_verification', userId, { verified: Boolean(verified) });
  return res.json({ message: 'Verification status updated' });
};

export const getReports = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT
        r.id,
        r.reason,
        r.description,
        r.status,
        r.created_at,
        ru.name AS reported_name,
        ru.email AS reported_email,
        rb.name AS reporter_name,
        rb.email AS reporter_email
     FROM reports r
     JOIN users ru ON ru.id = r.reported_user_id
     JOIN users rb ON rb.id = r.reported_by_id
     ORDER BY r.created_at DESC`
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
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(reports);
};

export const resolveReport = async (req, res) => {
  const { reportId } = req.params;
  await pool.execute('UPDATE reports SET status = \"resolved\" WHERE id = :id', { id: reportId });
  await logAdminAction(req.user?.id, 'resolve_report', reportId, null);
  return res.json({ message: 'Report resolved successfully' });
};

export const getAnalytics = async (req, res) => {
  const [[totalUsersRow]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
  const [[activeUsersRow]] = await pool.query(
    \"SELECT COUNT(*) AS activeUsers FROM users WHERE status = 'active'\"
  );
  const [[totalMessagesRow]] = await pool.query('SELECT COUNT(*) AS totalMessages FROM messages');
  const [[totalCallsRow]] = await pool.query('SELECT COUNT(*) AS totalCalls FROM calls');

  const [growthRows] = await pool.query(
    `SELECT DATE(created_at) AS date, COUNT(*) AS count
     FROM users
     GROUP BY DATE(created_at)
     ORDER BY DATE(created_at) DESC
     LIMIT 30`
  );

  const userGrowth = growthRows
    .map((row) => {
      const dateValue = row.date instanceof Date ? row.date.toISOString().slice(0, 10) : row.date;
      return {
        date: dateValue,
        count: row.count
      };
    })
    .reverse();

  return res.json({
    totalUsers: totalUsersRow.totalUsers || 0,
    activeUsers: activeUsersRow.activeUsers || 0,
    totalMessages: totalMessagesRow.totalMessages || 0,
    totalCalls: totalCallsRow.totalCalls || 0,
    userGrowth,
    messageStats: [],
    callStats: []
  });
};

export const getModerators = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT id, name, email, created_at
     FROM users
     WHERE is_moderator = 1
     ORDER BY created_at DESC`
  );

  const moderators = rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(moderators);
};

export const createModerator = async (req, res) => {
  const { email, password, name } = req.body || {};
  const missing = requireFields(req.body, ['email', 'password', 'name']);
  if (missing.length) {
    return sendError(res, 400, 'Email, password, and name required');
  }
  if (!isEmail(email)) {
    return sendError(res, 400, 'Email is invalid');
  }
  if (!isNonEmptyString(name)) {
    return sendError(res, 400, 'Name is required');
  }
  if (typeof password !== 'string' || password.length < 8) {
    return sendError(res, 400, 'Password must be at least 8 characters');
  }

  const [existing] = await pool.execute('SELECT id FROM users WHERE email = :email', { email });
  if (existing.length) {
    return sendError(res, 400, 'Email already in use');
  }

  const userId = uuid();
  const passwordHash = await bcrypt.hash(password, 10);

  await pool.execute(
    `INSERT INTO users (id, email, password_hash, name, verified, is_moderator, is_admin)
     VALUES (:id, :email, :password_hash, :name, 1, 1, 0)`,
    {
      id: userId,
      email,
      password_hash: passwordHash,
      name
    }
  );

  await logAdminAction(req.user?.id, 'create_moderator', userId, { email });
  return res.status(201).json({
    id: userId,
    name,
    email,
    createdAt: new Date().toISOString()
  });
};

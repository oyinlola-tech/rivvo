import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { sendError, requireFields, isEmail, isNonEmptyString } from '../utils/validation.js';

const isBadgeActive = (row) => {
  if (!row?.is_verified_badge) return false;
  if (!row.verified_badge_expires_at) return false;
  return new Date(row.verified_badge_expires_at) > new Date();
};

const mapUserRow = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  username: row.username || null,
  verified: Boolean(row.verified),
  isVerifiedBadge: isBadgeActive(row),
  isModerator: Boolean(row.is_moderator),
  isAdmin: Boolean(row.is_admin),
  createdAt: new Date(row.created_at).toISOString(),
  status: row.status,
  badgeStatus: isBadgeActive(row) ? 'active' : row.is_verified_badge ? 'expired' : 'none',
  verifiedBadgeExpiresAt: row.verified_badge_expires_at
    ? new Date(row.verified_badge_expires_at).toISOString()
    : null
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
    `SELECT id, name, email, username, verified, is_verified_badge, verified_badge_expires_at,
            is_moderator, is_admin, created_at, status
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
        r.type,
        r.reported_message_id,
        r.conversation_id,
        r.assigned_moderator_id,
        r.resolved_by_id,
        r.resolved_at,
        r.created_at,
        ru.id AS reported_id,
        ru.name AS reported_name,
        ru.email AS reported_email,
        rb.id AS reporter_id,
        rb.name AS reporter_name,
        rb.email AS reporter_email,
        am.name AS assigned_name,
        am.email AS assigned_email
     FROM reports r
     JOIN users ru ON ru.id = r.reported_user_id
     JOIN users rb ON rb.id = r.reported_by_id
     LEFT JOIN users am ON am.id = r.assigned_moderator_id
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
    assignedModerator: row.assigned_moderator_id
      ? { id: row.assigned_moderator_id, name: row.assigned_name, email: row.assigned_email }
      : null,
    resolvedBy: row.resolved_by_id,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json(reports);
};

export const resolveReport = async (req, res) => {
  const { reportId } = req.params;
  await pool.execute(
    `UPDATE reports
     SET status = 'resolved',
         resolved_by_id = :resolved_by_id,
         resolved_at = NOW()
     WHERE id = :id`,
    { id: reportId, resolved_by_id: req.user?.id }
  );
  await logAdminAction(req.user?.id, 'resolve_report', reportId, null);
  return res.json({ message: 'Report resolved successfully' });
};

export const assignReport = async (req, res) => {
  const { reportId } = req.params;
  const { moderatorId } = req.body || {};
  const value = moderatorId || null;

  if (value) {
    const [rows] = await pool.execute(
      `SELECT id FROM users WHERE id = :id AND is_moderator = 1 LIMIT 1`,
      { id: value }
    );
    if (!rows.length) {
      return sendError(res, 400, 'Moderator not found');
    }
  }

  await pool.execute(
    `UPDATE reports
     SET assigned_moderator_id = :moderator_id
     WHERE id = :id`,
    { id: reportId, moderator_id: value }
  );

  await logAdminAction(req.user?.id, 'assign_report', reportId, { moderatorId: value });
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

  await logAdminAction(req.user?.id, 'update_user_status', userId, { status });
  return res.json({ message: 'User status updated' });
};

export const getReportMessagesAdmin = async (req, res) => {
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

export const getAnalytics = async (req, res) => {
  const [[totalUsersRow]] = await pool.query('SELECT COUNT(*) AS totalUsers FROM users');
  const [[activeUsersRow]] = await pool.query(
    "SELECT COUNT(*) AS activeUsers FROM users WHERE status = 'active'"
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

export const getVerificationPayments = async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const offset = (page - 1) * limit;
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const reviewStatus = typeof req.query.reviewStatus === 'string' ? req.query.reviewStatus : null;
  const allowedStatus = new Set(['pending', 'successful', 'failed', 'cancelled']);
  const allowedReview = new Set(['pending', 'approved', 'rejected']);
  if (status && !allowedStatus.has(status)) {
    return sendError(res, 400, 'status must be pending, successful, failed, or cancelled');
  }
  if (reviewStatus && !allowedReview.has(reviewStatus)) {
    return sendError(res, 400, 'reviewStatus must be pending, approved, or rejected');
  }

  const whereParts = [];
  const params = { limit, offset };
  if (status) {
    whereParts.push('vp.status = :status');
    params.status = status;
  }
  if (reviewStatus) {
    whereParts.push('vp.review_status = :review_status');
    params.review_status = reviewStatus;
  }
  const whereClause = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

  const [[countRow]] = await pool.execute(
    `SELECT COUNT(*) AS total FROM verification_payments vp ${whereClause}`,
    params
  );

  const [rows] = await pool.execute(
    `SELECT
        vp.id,
        vp.user_id,
        vp.amount,
        vp.currency,
        vp.status,
        vp.review_status,
        vp.reviewed_by,
        vp.reviewed_at,
        vp.rejection_reason,
        vp.tx_ref,
        vp.flw_transaction_id,
        vp.flw_status,
        vp.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.phone AS user_phone,
        u.username AS user_username
     FROM verification_payments vp
     JOIN users u ON u.id = vp.user_id
     ${whereClause}
     ORDER BY vp.created_at DESC
     LIMIT :limit OFFSET :offset`,
    params
  );

  const total = countRow.total || 0;
  const totalPages = Math.ceil(total / limit);

  const payments = rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    user: {
      name: row.user_name,
      email: row.user_email,
      phone: row.user_phone || null,
      username: row.user_username || null
    },
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    rejectionReason: row.rejection_reason || null,
    txRef: row.tx_ref,
    flwTransactionId: row.flw_transaction_id,
    flwStatus: row.flw_status,
    createdAt: new Date(row.created_at).toISOString()
  }));

  return res.json({ payments, total, page, totalPages });
};

export const reviewVerificationPayment = async (req, res) => {
  const { paymentId } = req.params;
  const { action, reason } = req.body || {};
  let paymentUserId = null;
  if (!paymentId) {
    return sendError(res, 400, 'paymentId is required');
  }
  if (action !== 'approve' && action !== 'reject') {
    return sendError(res, 400, 'action must be approve or reject');
  }
  if (action === 'reject') {
    if (typeof reason !== 'string' || reason.trim().length === 0) {
      return sendError(res, 400, 'reason is required for rejection');
    }
    if (reason.trim().length > 255) {
      return sendError(res, 400, 'reason must be 255 characters or less');
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT * FROM verification_payments WHERE id = :id LIMIT 1 FOR UPDATE`,
      { id: paymentId }
    );
    const payment = rows[0];
    if (!payment) {
      await connection.rollback();
      return sendError(res, 404, 'Payment not found');
    }
    paymentUserId = payment.user_id;
    if (payment.status !== 'successful') {
      await connection.rollback();
      return sendError(res, 400, 'Only successful payments can be reviewed');
    }
    if (payment.review_status !== 'pending') {
      await connection.rollback();
      return sendError(res, 409, 'Payment already reviewed');
    }

    if (action === 'approve') {
      const [userRows] = await connection.execute(
        `SELECT phone, username FROM users WHERE id = :id LIMIT 1`,
        { id: payment.user_id }
      );
      const user = userRows[0];
      if (!user?.phone || !user?.username) {
        await connection.rollback();
        return sendError(res, 400, 'User must have a phone number and username to receive verification');
      }

      await connection.execute(
        `UPDATE users
         SET is_verified_badge = 1,
             verified_badge_expires_at = DATE_ADD(
               GREATEST(NOW(), COALESCE(verified_badge_expires_at, NOW())),
               INTERVAL 1 MONTH
             )
         WHERE id = :id`,
        { id: payment.user_id }
      );
    }

    const [updateResult] = await connection.execute(
      `UPDATE verification_payments
       SET review_status = :review_status,
           reviewed_by = :reviewed_by,
           reviewed_at = NOW(),
           rejection_reason = :rejection_reason
       WHERE id = :id AND review_status = 'pending'`,
      {
        id: paymentId,
        review_status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: req.user?.id || null,
        rejection_reason: action === 'reject' ? reason.trim() : null
      }
    );

    if (!updateResult.affectedRows) {
      await connection.rollback();
      return sendError(res, 409, 'Payment already reviewed');
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  await logAdminAction(req.user?.id, 'review_verification_payment', paymentId, {
    action,
    reason: action === 'reject' ? reason.trim() : null
  });

  if (paymentUserId) {
    await pool.execute(`DELETE FROM verification_payment_locks WHERE user_id = :user_id`, {
      user_id: paymentUserId
    });
  }

  return res.json({ message: `Payment ${action}d` });
};

export const updateVerificationBadge = async (req, res) => {
  const { userId } = req.params;
  const { active } = req.body || {};

  if (active !== true && active !== false) {
    return sendError(res, 400, 'active must be true or false');
  }

  await pool.execute(
    `UPDATE users
     SET is_verified_badge = :active,
         verified_badge_expires_at = CASE WHEN :active = 1 THEN verified_badge_expires_at ELSE NULL END
     WHERE id = :id`,
    { id: userId, active: active ? 1 : 0 }
  );

  await logAdminAction(req.user?.id, 'update_verification_badge', userId, { active });
  return res.json({ message: 'Verification badge updated' });
};
export const getVerificationPricing = async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT amount, currency, active, updated_at
     FROM verification_settings
     ORDER BY updated_at DESC
     LIMIT 1`
  );

  if (!rows.length) {
    return res.json({ amount: null, currency: null, active: false, updatedAt: null });
  }

  const row = rows[0];
  return res.json({
    amount: Number(row.amount),
    currency: row.currency,
    active: Boolean(row.active),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null
  });
};

export const setVerificationPricing = async (req, res) => {
  const { amount, currency, active } = req.body || {};
  const parsedAmount = Number(amount);
  const normalizedCurrency =
    typeof currency === 'string' ? currency.trim().toUpperCase() : '';

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return sendError(res, 400, 'amount must be a positive number');
  }
  if (!normalizedCurrency || normalizedCurrency.length !== 3) {
    return sendError(res, 400, 'currency must be a 3-letter code');
  }

  await pool.execute(
    `INSERT INTO verification_settings (id, amount, currency, active, updated_by)
     VALUES (:id, :amount, :currency, :active, :updated_by)`,
    {
      id: uuid(),
      amount: parsedAmount,
      currency: normalizedCurrency,
      active: active === undefined ? 1 : active ? 1 : 0,
      updated_by: req.user?.id || null
    }
  );

  await logAdminAction(req.user?.id, 'update_verification_pricing', null, {
    amount: parsedAmount,
    currency: normalizedCurrency,
    active: active === undefined ? true : Boolean(active)
  });

  return res.json({ message: 'Verification pricing updated' });
};

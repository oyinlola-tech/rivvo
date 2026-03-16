import pool from '../config/db.js';
import { isUserOnline } from '../services/presenceService.js';
import { v4 as uuid } from 'uuid';
import { sendError, requireFields } from '../utils/validation.js';

const hasContact = async (userId, contactId) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM contacts WHERE user_id = :user_id AND contact_id = :contact_id LIMIT 1`,
    { user_id: userId, contact_id: contactId }
  );
  return rows.length > 0;
};

const getRequestStatus = async (userId, otherUserId) => {
  const [rows] = await pool.execute(
    `SELECT id, requester_id, recipient_id, status
     FROM contact_requests
     WHERE (requester_id = :user_id AND recipient_id = :other_user_id)
        OR (requester_id = :other_user_id AND recipient_id = :user_id)
     ORDER BY created_at DESC
     LIMIT 1`,
    { user_id: userId, other_user_id: otherUserId }
  );
  return rows[0] || null;
};

export const getContacts = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar, u.verified,
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
    phone: row.phone || null,
    avatar: row.avatar || null,
    online: isUserOnline(row.id),
    verified: Boolean(row.verified),
    isVerifiedBadge: Boolean(row.is_verified_badge_active),
    badgeStatus: row.badge_status,
    isModerator: Boolean(row.is_moderator),
    isAdmin: Boolean(row.is_admin)
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

  if (contactId === userId) {
    return sendError(res, 400, 'Cannot add yourself');
  }

  const alreadyContact = await hasContact(userId, contactId);
  if (alreadyContact) {
    return res.json({ message: 'Already contacts' });
  }

  const existing = await getRequestStatus(userId, contactId);
  if (existing?.status === 'pending') {
    return res.json({ message: 'Request already pending' });
  }

  const requestId = uuid();
  await pool.execute(
    `INSERT INTO contact_requests (id, requester_id, recipient_id, status)
     VALUES (:id, :requester_id, :recipient_id, 'pending')`,
    { id: requestId, requester_id: userId, recipient_id: contactId }
  );

  const [requesterRows] = await pool.execute(
    `SELECT id, name, avatar
     FROM users
     WHERE id = :id
     LIMIT 1`,
    { id: userId }
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${contactId}`).emit('contact_request', {
      requestId,
      from: requesterRows[0] || { id: userId }
    });
    io.to(`user:${contactId}`).emit('notification', {
      type: 'contact_request',
      requestId,
      from: requesterRows[0] || { id: userId }
    });
  }

  return res.status(201).json({ message: 'Contact request sent', id: requestId });
};

export const listContactRequests = async (req, res) => {
  const userId = req.user?.id;
  const direction = req.query.direction === 'outgoing' ? 'outgoing' : 'incoming';

  const [rows] = await pool.execute(
    `SELECT r.id, r.requester_id, r.recipient_id, r.status, r.created_at, r.read_at,
            u.id AS user_id, u.name, u.email, u.phone, u.avatar, u.verified,
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
     FROM contact_requests r
     JOIN users u ON u.id = ${direction === 'incoming' ? 'r.requester_id' : 'r.recipient_id'}
     WHERE ${direction === 'incoming' ? 'r.recipient_id' : 'r.requester_id'} = :user_id
       AND r.status = 'pending'
     ORDER BY r.created_at DESC`,
    { user_id: userId }
  );

  const requests = rows.map((row) => ({
    id: row.id,
    status: row.status,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    user: {
      id: row.user_id,
      name: row.name,
      email: row.email,
      phone: row.phone || null,
      avatar: row.avatar || null,
      verified: Boolean(row.verified),
      isVerifiedBadge: Boolean(row.is_verified_badge_active),
      badgeStatus: row.badge_status,
      isModerator: Boolean(row.is_moderator),
      isAdmin: Boolean(row.is_admin)
    }
  }));

  return res.json(requests);
};

export const getContactRequestUnreadCount = async (req, res) => {
  const userId = req.user?.id;
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS unreadCount
     FROM contact_requests
     WHERE recipient_id = :user_id
       AND status = 'pending'
       AND read_at IS NULL`,
    { user_id: userId }
  );

  return res.json({ unreadCount: Number(rows[0]?.unreadCount || 0) });
};

export const markContactRequestsRead = async (req, res) => {
  const userId = req.user?.id;
  const [result] = await pool.execute(
    `UPDATE contact_requests
     SET read_at = NOW()
     WHERE recipient_id = :user_id
       AND status = 'pending'
       AND read_at IS NULL`,
    { user_id: userId }
  );

  return res.json({ message: 'Notifications marked as read', updated: result?.affectedRows || 0 });
};

export const acceptContactRequest = async (req, res) => {
  const userId = req.user?.id;
  const { requestId } = req.params;

  const [rows] = await pool.execute(
    `SELECT requester_id, recipient_id, status
     FROM contact_requests
     WHERE id = :id AND recipient_id = :user_id
     LIMIT 1`,
    { id: requestId, user_id: userId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Request not found');
  }

  if (rows[0].status !== 'pending') {
    return res.json({ message: 'Request already processed' });
  }

  const requesterId = rows[0].requester_id;

  await pool.execute(
    `UPDATE contact_requests SET status = 'accepted' WHERE id = :id`,
    { id: requestId }
  );

  await pool.execute(
    `INSERT IGNORE INTO contacts (user_id, contact_id)
     VALUES (:user_id, :contact_id), (:contact_id, :user_id)`,
    { user_id: userId, contact_id: requesterId }
  );

  const [acceptorRows] = await pool.execute(
    `SELECT id, name, avatar
     FROM users
     WHERE id = :id
     LIMIT 1`,
    { id: userId }
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`user:${requesterId}`).emit('contact_request_accepted', {
      requestId,
      by: acceptorRows[0] || { id: userId }
    });
    io.to(`user:${requesterId}`).emit('notification', {
      type: 'contact_request_accepted',
      requestId,
      by: acceptorRows[0] || { id: userId }
    });
  }

  return res.json({ message: 'Contact request accepted' });
};

export const rejectContactRequest = async (req, res) => {
  const userId = req.user?.id;
  const { requestId } = req.params;

  const [rows] = await pool.execute(
    `SELECT id FROM contact_requests
     WHERE id = :id AND recipient_id = :user_id
     LIMIT 1`,
    { id: requestId, user_id: userId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Request not found');
  }

  const [requestRows] = await pool.execute(
    `SELECT requester_id
     FROM contact_requests
     WHERE id = :id
     LIMIT 1`,
    { id: requestId }
  );

  await pool.execute(
    `UPDATE contact_requests SET status = 'rejected' WHERE id = :id`,
    { id: requestId }
  );

  const requesterId = requestRows[0]?.requester_id;
  const io = req.app.get('io');
  if (io && requesterId) {
    io.to(`user:${requesterId}`).emit('contact_request_rejected', { requestId });
    io.to(`user:${requesterId}`).emit('notification', {
      type: 'contact_request_rejected',
      requestId
    });
  }

  return res.json({ message: 'Contact request rejected' });
};

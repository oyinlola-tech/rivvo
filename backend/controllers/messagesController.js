import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import { isUserOnline } from '../services/presenceService.js';
import { sendError, isNonEmptyString } from '../utils/validation.js';
import fs from 'fs';
import path from 'path';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const safeUnlink = (targetPath) => {
  if (!targetPath || typeof targetPath !== 'string') return;
  try {
    const resolved = path.resolve(targetPath);
    if (!resolved.startsWith(uploadsRoot)) return;
    fs.unlink(resolved, () => {});
  } catch (error) {
    // Best-effort cleanup only.
  }
};

const ensureParticipant = async (userId, conversationId) => {
  const [rows] = await pool.execute(
    `SELECT 1 FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id = :user_id
     LIMIT 1`,
    { conversation_id: conversationId, user_id: userId }
  );
  return rows.length > 0;
};

const findConversationWith = async (userId, otherUserId) => {
  const [rows] = await pool.execute(
    `SELECT cp1.conversation_id AS id
     FROM conversation_participants cp1
     JOIN conversation_participants cp2
       ON cp2.conversation_id = cp1.conversation_id
     WHERE cp1.user_id = :user_id AND cp2.user_id = :other_user_id
     LIMIT 1`,
    { user_id: userId, other_user_id: otherUserId }
  );
  return rows[0]?.id || null;
};

const hasMutualContact = async (userId, otherUserId) => {
  const [rows] = await pool.execute(
    `SELECT 1
     FROM contacts c1
     JOIN contacts c2 ON c2.user_id = c1.contact_id AND c2.contact_id = c1.user_id
     WHERE c1.user_id = :user_id AND c1.contact_id = :other_user_id
     LIMIT 1`,
    { user_id: userId, other_user_id: otherUserId }
  );
  return rows.length > 0;
};

const getGroupByConversation = async (conversationId) => {
  const [rows] = await pool.execute(
    `SELECT id, name, is_private
     FROM groups
     WHERE conversation_id = :conversation_id
     LIMIT 1`,
    { conversation_id: conversationId }
  );
  return rows[0] || null;
};

export const getConversations = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return sendError(res, 401, 'Unauthorized');
  }

  await pool.execute(
    `INSERT IGNORE INTO conversation_participants (conversation_id, user_id)
     SELECT g.conversation_id, gm.user_id
     FROM group_members gm
     JOIN groups g ON g.id = gm.group_id
     WHERE gm.user_id = :user_id AND gm.status = 'active' AND g.conversation_id IS NOT NULL`,
    { user_id: userId }
  );
  const [rows] = await pool.execute(
    `SELECT
        c.id AS conversation_id,
        c.created_at AS conversation_created_at,
        u.id AS user_id,
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
        u.is_admin,
        CASE
          WHEN cu.is_verified_badge = 1 AND cu.verified_badge_expires_at > NOW()
          THEN 1 ELSE 0
        END AS is_my_verified_badge_active,
        lm.body AS last_text,
        lm.created_at AS last_timestamp,
        lm.is_encrypted AS last_encrypted,
        lm.view_once AS last_view_once,
        lm.deleted_for_all_at AS last_deleted_all,
        CASE
          WHEN lm.sender_id = :user_id THEN lm.deleted_for_sender_at
          ELSE lm.deleted_for_recipient_at
        END AS last_deleted_for_user,
        cp1.last_read_at AS last_read_at,
        CASE
          WHEN c.last_mutual_at IS NULL THEN 0
          WHEN TIMESTAMPDIFF(HOUR, c.last_mutual_at, NOW()) >= 24 THEN 0
          ELSE c.streak_count
        END AS streak_count,
        CASE
          WHEN c.last_mutual_at IS NULL THEN 0
          WHEN TIMESTAMPDIFF(HOUR, c.last_mutual_at, NOW()) >= 24 THEN 0
          WHEN (CASE WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 1 ELSE 0 END) = 1
            OR (CASE WHEN cu.is_verified_badge = 1 AND cu.verified_badge_expires_at > NOW() THEN 1 ELSE 0 END) = 1
            THEN c.streak_count
          WHEN c.streak_count >= 3 THEN c.streak_count
          ELSE 0
        END AS effective_streak_count,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> :user_id
            AND (
              (m.view_once = 1 AND m.view_once_viewed_at IS NULL)
              OR (m.view_once = 0 AND (cp1.last_read_at IS NULL OR m.created_at > cp1.last_read_at))
            )
        ) AS unread_count
     FROM conversations c
     JOIN conversation_participants cp1
       ON cp1.conversation_id = c.id AND cp1.user_id = :user_id
     JOIN conversation_participants cp2
       ON cp2.conversation_id = c.id AND cp2.user_id <> :user_id
     JOIN users u ON u.id = cp2.user_id
     JOIN users cu ON cu.id = :user_id
     LEFT JOIN (
       SELECT m1.conversation_id, m1.body, m1.created_at, m1.is_encrypted, m1.view_once, m1.sender_id,
              m1.deleted_for_all_at, m1.deleted_for_sender_at, m1.deleted_for_recipient_at
       FROM messages m1
       JOIN (
         SELECT conversation_id, MAX(created_at) AS max_created
         FROM messages
         GROUP BY conversation_id
       ) mm
         ON mm.conversation_id = m1.conversation_id AND mm.max_created = m1.created_at
     ) lm ON lm.conversation_id = c.id
     ORDER BY IFNULL(lm.created_at, c.created_at) DESC`,
    { user_id: userId }
  );

  const directConversations = rows.map((row) => ({
    id: row.conversation_id,
    user: {
      id: row.user_id,
      name: row.name,
      avatar: row.avatar || null,
      online: isUserOnline(row.user_id),
      verified: Boolean(row.verified),
      isVerifiedBadge: Boolean(row.is_verified_badge_active),
      badgeStatus: row.badge_status,
      isModerator: Boolean(row.is_moderator),
      isAdmin: Boolean(row.is_admin)
    },
    lastMessage: {
      text: row.last_deleted_all
        ? 'Message deleted'
        : row.last_deleted_for_user
          ? 'Message deleted'
          : row.last_view_once
            ? 'View once message'
            : row.last_encrypted
              ? 'Encrypted message'
              : row.last_text || '',
      timestamp: row.last_timestamp ? new Date(row.last_timestamp).toISOString() : null,
      unreadCount: Number(row.unread_count || 0)
    },
    streakCount: Number(row.effective_streak_count || 0),
    _sortTimestamp: row.last_timestamp || row.conversation_created_at
  }));

  const [groupRows] = await pool.execute(
    `SELECT
        c.id AS conversation_id,
        c.created_at AS conversation_created_at,
        g.id AS group_id,
        g.name AS group_name,
        g.avatar AS group_avatar,
        g.is_private AS group_is_private,
        (
          SELECT COUNT(*)
          FROM group_members gm2
          WHERE gm2.group_id = g.id AND gm2.status = 'active'
        ) AS member_count,
        lm.body AS last_text,
        lm.created_at AS last_timestamp,
        lm.is_encrypted AS last_encrypted,
        lm.view_once AS last_view_once,
        lm.deleted_for_all_at AS last_deleted_all,
        lm.deleted_for_sender_at AS last_deleted_for_sender,
        lm.deleted_for_recipient_at AS last_deleted_for_recipient,
        lm.sender_id AS last_sender_id,
        cp.last_read_at AS last_read_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
            AND m.sender_id <> :user_id
            AND (
              (m.view_once = 1 AND m.view_once_viewed_at IS NULL)
              OR (m.view_once = 0 AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at))
            )
        ) AS unread_count
     FROM groups g
     JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = :user_id AND gm.status = 'active'
     JOIN conversations c ON c.id = g.conversation_id
     LEFT JOIN conversation_participants cp
       ON cp.conversation_id = c.id AND cp.user_id = :user_id
     LEFT JOIN (
       SELECT m1.conversation_id, m1.body, m1.created_at, m1.is_encrypted, m1.view_once, m1.sender_id,
              m1.deleted_for_all_at, m1.deleted_for_sender_at, m1.deleted_for_recipient_at
       FROM messages m1
       JOIN (
         SELECT conversation_id, MAX(created_at) AS max_created
         FROM messages
         GROUP BY conversation_id
       ) mm
         ON mm.conversation_id = m1.conversation_id AND mm.max_created = m1.created_at
     ) lm ON lm.conversation_id = c.id
     ORDER BY IFNULL(lm.created_at, c.created_at) DESC`,
    { user_id: userId }
  );

  const groupConversations = groupRows.map((row) => {
    const lastDeletedForUser =
      row.last_sender_id === userId ? row.last_deleted_for_sender : row.last_deleted_for_recipient;
    return {
      id: row.conversation_id,
      user: {
        id: row.group_id,
        name: row.group_name,
        avatar: row.group_avatar || null,
        online: false,
        verified: false,
        isVerifiedBadge: false,
        badgeStatus: 'none',
        isModerator: false,
        isAdmin: false,
        isGroup: true,
        isPrivate: Boolean(row.group_is_private),
        memberCount: Number(row.member_count || 0)
      },
      lastMessage: {
        text: row.last_deleted_all
          ? 'Message deleted'
          : lastDeletedForUser
            ? 'Message deleted'
            : row.last_view_once
              ? 'View once message'
              : row.last_encrypted
                ? 'Encrypted message'
                : row.last_text || '',
        timestamp: row.last_timestamp ? new Date(row.last_timestamp).toISOString() : null,
        unreadCount: Number(row.unread_count || 0)
      },
      streakCount: 0,
      _sortTimestamp: row.last_timestamp || row.conversation_created_at
    };
  });

  const combined = [...directConversations, ...groupConversations]
    .sort((a, b) => {
      const at = a._sortTimestamp ? new Date(a._sortTimestamp).getTime() : 0;
      const bt = b._sortTimestamp ? new Date(b._sortTimestamp).getTime() : 0;
      return bt - at;
    })
    .map(({ _sortTimestamp, ...rest }) => rest);

  return res.json(combined);
};

export const getMessages = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const since = req.query.since ? new Date(req.query.since) : null;
  const markRead = req.query.markRead !== 'false';
  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const params = { conversation_id: conversationId };
  let sinceFilter = '';
  if (since && !Number.isNaN(since.getTime())) {
    params.since = since;
    sinceFilter = ' AND created_at > :since';
  }

  const [rows] = await pool.execute(
    `SELECT id, body, created_at, sender_id, delivered_at, read_at, is_encrypted, iv, view_once, view_once_viewed_at,
            edited_at, deleted_for_sender_at, deleted_for_recipient_at, deleted_for_all_at
     FROM messages
     WHERE conversation_id = :conversation_id${sinceFilter}
     ORDER BY created_at ASC`,
    params
  );

  const undeliveredIds = rows
    .filter((row) => row.sender_id !== userId && !row.delivered_at)
    .map((row) => row.id);
  if (undeliveredIds.length) {
    await pool.execute(
      `UPDATE messages
       SET delivered_at = NOW()
       WHERE conversation_id = :conversation_id
         AND sender_id <> :user_id
         AND delivered_at IS NULL`,
      { conversation_id: conversationId, user_id: userId }
    );

    const [participantRows] = await pool.execute(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
      { conversation_id: conversationId, user_id: userId }
    );

    const io = req.app.get('io');
    if (io && participantRows.length) {
      participantRows.forEach((row) => {
        io.to(`user:${row.user_id}`).emit('delivery_receipt', {
          conversationId,
          messageIds: undeliveredIds,
          deliveredAt: new Date().toISOString()
        });
      });
    }
  }

  if (markRead) {
    await pool.execute(
      `UPDATE conversation_participants
       SET last_read_at = NOW()
       WHERE conversation_id = :conversation_id AND user_id = :user_id`,
      { conversation_id: conversationId, user_id: userId }
    );

    await pool.execute(
      `UPDATE messages
       SET read_at = NOW()
       WHERE conversation_id = :conversation_id
         AND sender_id <> :user_id
         AND read_at IS NULL
         AND view_once = 0`,
      { conversation_id: conversationId, user_id: userId }
    );
  }

  const messages = rows
    .filter((row) => {
      if (row.sender_id === userId && row.deleted_for_sender_at) return false;
      if (row.sender_id !== userId && row.deleted_for_recipient_at) return false;
      if (row.view_once && row.sender_id !== userId && row.view_once_viewed_at) return false;
      return true;
    })
    .map((row) => ({
      id: row.id,
      text: row.deleted_for_all_at ? '' : row.body,
      timestamp: new Date(row.created_at).toISOString(),
      sender: row.sender_id === userId ? 'me' : 'them',
      senderId: row.sender_id,
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null,
      editedAt: row.edited_at ? new Date(row.edited_at).toISOString() : null,
      deletedForAllAt: row.deleted_for_all_at ? new Date(row.deleted_for_all_at).toISOString() : null,
      encrypted: Boolean(row.is_encrypted),
      iv: row.iv || null,
      viewOnce: Boolean(row.view_once),
      viewOnceViewedAt: row.view_once_viewed_at
        ? new Date(row.view_once_viewed_at).toISOString()
        : null
    }));

  return res.json({
    messages,
    serverTime: new Date().toISOString()
  });
};

export const getConversationPreview = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const limitRaw = Number(req.query.limit || 5);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 10) : 5;

  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [rows] = await pool.execute(
    `SELECT id, body, created_at, sender_id, is_encrypted, view_once, view_once_viewed_at,
            deleted_for_sender_at, deleted_for_recipient_at, deleted_for_all_at
     FROM messages
     WHERE conversation_id = :conversation_id
     ORDER BY created_at DESC
     LIMIT :limit`,
    { conversation_id: conversationId, limit }
  );

  const previews = rows
    .filter((row) => {
      if (row.sender_id === userId && row.deleted_for_sender_at) return false;
      if (row.sender_id !== userId && row.deleted_for_recipient_at) return false;
      return true;
    })
    .reverse()
    .map((row) => {
      let text = row.body || '';
      if (row.deleted_for_all_at) {
        text = 'Message deleted';
      } else if (row.view_once && !row.view_once_viewed_at && row.sender_id !== userId) {
        text = 'View once message';
      } else if (row.is_encrypted) {
        text = 'Encrypted message';
      } else {
        try {
          const parsed = JSON.parse(text);
          if (parsed?.type === 'attachment') {
            if (parsed.kind === 'voice' || parsed.kind === 'audio') {
              text = 'Voice note';
            } else if (parsed.kind === 'media') {
              text = 'Media attachment';
            } else {
              text = 'Attachment';
            }
          }
        } catch {
          // Keep text as-is.
        }
      }

      return {
        id: row.id,
        text,
        timestamp: row.created_at ? new Date(row.created_at).toISOString() : null,
        sender: row.sender_id === userId ? 'me' : 'them'
      };
    });

  return res.json(previews);
};

export const sendMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const { message, ciphertext, iv, encrypted, viewOnce } = req.body || {};

  const finalMessage = ciphertext || message;
  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }
  if (!isNonEmptyString(finalMessage)) {
    return sendError(res, 400, 'Message is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const groupConversation = await getGroupByConversation(conversationId);
  const isGroupConversation = Boolean(groupConversation);

  const [participantRows] = await pool.execute(
    `SELECT user_id FROM conversation_participants
     WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  const otherUserId = participantRows[0]?.user_id;
  if (!otherUserId && !isGroupConversation) {
    return sendError(res, 400, 'Conversation is missing participant');
  }

  if (!isGroupConversation) {
    const mutual = await hasMutualContact(userId, otherUserId);
    if (!mutual) {
      return sendError(res, 403, 'Contact request not accepted');
    }
  }

  if (otherUserId && !isGroupConversation) {
    const [blockRows] = await pool.execute(
      `SELECT 1 FROM blocks
       WHERE (blocker_id = :user_id AND blocked_id = :other_user_id)
          OR (blocker_id = :other_user_id AND blocked_id = :user_id)
       LIMIT 1`,
      { user_id: userId, other_user_id: otherUserId }
    );
    if (blockRows.length) {
      return sendError(res, 403, 'Messaging is blocked');
    }
  }

  const messageId = uuid();
  await pool.execute(
    `INSERT INTO messages (id, conversation_id, sender_id, body, iv, is_encrypted, view_once)
     VALUES (:id, :conversation_id, :sender_id, :body, :iv, :is_encrypted, :view_once)`,
    {
      id: messageId,
      conversation_id: conversationId,
      sender_id: userId,
      body: finalMessage.trim(),
      iv: iv || null,
      is_encrypted: encrypted ? 1 : 0,
      view_once: viewOnce ? 1 : 0
    }
  );

  await pool.execute(
    `UPDATE conversation_participants
     SET last_read_at = NOW(), last_message_at = NOW()
     WHERE conversation_id = :conversation_id AND user_id = :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  if (!isGroupConversation) {
    const [otherLastRows] = await pool.execute(
      `SELECT last_message_at
       FROM conversation_participants
       WHERE conversation_id = :conversation_id AND user_id = :other_user_id
       LIMIT 1`,
      { conversation_id: conversationId, other_user_id: otherUserId }
    );

    const [streakRows] = await pool.execute(
      `SELECT streak_count, last_mutual_at
       FROM conversations
       WHERE id = :conversation_id
       LIMIT 1`,
      { conversation_id: conversationId }
    );

    const now = new Date();
    const otherLast = otherLastRows[0]?.last_message_at ? new Date(otherLastRows[0].last_message_at) : null;
    const lastMutual = streakRows[0]?.last_mutual_at ? new Date(streakRows[0].last_mutual_at) : null;
    let streakCount = Number(streakRows[0]?.streak_count || 0);
    const DAY_MS = 24 * 60 * 60 * 1000;

    if (lastMutual && now.getTime() - lastMutual.getTime() >= DAY_MS) {
      streakCount = 0;
    }

    const otherRecent = otherLast && now.getTime() - otherLast.getTime() <= DAY_MS;
    if (otherRecent) {
      if (!lastMutual || now.getTime() - lastMutual.getTime() >= DAY_MS) {
        streakCount += 1;
        await pool.execute(
          `UPDATE conversations
           SET streak_count = :streak_count, last_mutual_at = NOW()
           WHERE id = :conversation_id`,
          { streak_count: streakCount, conversation_id: conversationId }
        );
      }
    } else if (lastMutual && now.getTime() - lastMutual.getTime() >= DAY_MS) {
      await pool.execute(
        `UPDATE conversations
         SET streak_count = :streak_count, last_mutual_at = NULL
         WHERE id = :conversation_id`,
        { streak_count: streakCount, conversation_id: conversationId }
      );
    }
  }

  const recipientId = otherUserId;
  let deliveredAt = null;
  if (otherUserId && !isGroupConversation && isUserOnline(otherUserId)) {
    deliveredAt = new Date();
    await pool.execute(
      `UPDATE messages SET delivered_at = NOW() WHERE id = :id`,
      { id: messageId }
    );
  }

  const payload = {
    id: messageId,
    text: finalMessage.trim(),
    timestamp: new Date().toISOString(),
    sender: 'me',
    senderId: userId,
    readAt: null,
    deliveredAt: deliveredAt ? deliveredAt.toISOString() : null,
    encrypted: Boolean(encrypted),
    iv: iv || null,
    viewOnce: Boolean(viewOnce),
    viewOnceViewedAt: null
  };

  const io = req.app.get('io');
  if (io) {
    if (isGroupConversation) {
      io.to(`conversation:${conversationId}`).emit('new_message', {
        conversationId,
        message: { ...payload, sender: 'them' }
      });
    } else if (recipientId) {
      io.to(`user:${recipientId}`).emit('new_message', {
        conversationId,
        message: { ...payload, sender: 'them' }
      });
      if (deliveredAt) {
        io.to(`user:${userId}`).emit('delivery_receipt', {
          conversationId,
          messageIds: [messageId],
          deliveredAt: deliveredAt.toISOString()
        });
      }
    }
  }

  return res.status(201).json(payload);
};

export const getOrCreateConversation = async (req, res) => {
  const userId = req.user?.id;
  const { userId: otherUserId } = req.params;

  if (!otherUserId) {
    return sendError(res, 400, 'userId is required');
  }
  if (otherUserId === userId) {
    return sendError(res, 400, 'Cannot create conversation with yourself');
  }

  const [blockRows] = await pool.execute(
    `SELECT 1 FROM blocks
     WHERE (blocker_id = :user_id AND blocked_id = :other_user_id)
        OR (blocker_id = :other_user_id AND blocked_id = :user_id)
     LIMIT 1`,
    { user_id: userId, other_user_id: otherUserId }
  );
  if (blockRows.length) {
    return sendError(res, 403, 'Messaging is blocked');
  }

  const mutual = await hasMutualContact(userId, otherUserId);
  if (!mutual) {
    return sendError(res, 403, 'Contact request not accepted');
  }

  const existing = await findConversationWith(userId, otherUserId);
  if (existing) {
    return res.json({ id: existing });
  }

  const conversationId = uuid();
  await pool.execute(`INSERT INTO conversations (id) VALUES (:id)`, { id: conversationId });
  await pool.execute(
    `INSERT INTO conversation_participants (conversation_id, user_id)
     VALUES (:conversation_id, :user_id), (:conversation_id, :other_user_id)`,
    { conversation_id: conversationId, user_id: userId, other_user_id: otherUserId }
  );

  return res.status(201).json({ id: conversationId });
};

export const markConversationRead = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const isGroupConversation = Boolean(await getGroupByConversation(conversationId));

  await pool.execute(
    `UPDATE conversation_participants
     SET last_read_at = NOW()
     WHERE conversation_id = :conversation_id AND user_id = :user_id`,
    { conversation_id: conversationId, user_id: userId }
  );

  await pool.execute(
    `UPDATE messages
     SET read_at = NOW()
     WHERE conversation_id = :conversation_id
       AND sender_id <> :user_id
       AND read_at IS NULL
       AND view_once = 0`,
    { conversation_id: conversationId, user_id: userId }
  );

  if (!isGroupConversation) {
    const [participantRows] = await pool.execute(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
      { conversation_id: conversationId, user_id: userId }
    );

    const otherUserId = participantRows[0]?.user_id;
    const io = req.app.get('io');
    if (io && otherUserId) {
      io.to(`user:${otherUserId}`).emit('read_receipt', {
        conversationId,
        readerId: userId,
        readAt: new Date().toISOString()
      });
    }
  }

  return res.json({ message: 'Conversation marked as read' });
};

export const viewOnceMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const messageId = req.params.messageId;

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const isGroupConversation = Boolean(await getGroupByConversation(conversationId));

  await pool.execute(
    `UPDATE messages
     SET view_once_viewed_at = NOW(), read_at = NOW()
     WHERE id = :id AND conversation_id = :conversation_id AND sender_id <> :user_id`,
    { id: messageId, conversation_id: conversationId, user_id: userId }
  );

  if (!isGroupConversation) {
    const [participantRows] = await pool.execute(
      `SELECT user_id FROM conversation_participants
       WHERE conversation_id = :conversation_id AND user_id <> :user_id`,
      { conversation_id: conversationId, user_id: userId }
    );

    const otherUserId = participantRows[0]?.user_id;
    const io = req.app.get('io');
    if (io && otherUserId) {
      io.to(`user:${otherUserId}`).emit('view_once_viewed', {
        conversationId,
        messageId,
        readAt: new Date().toISOString()
      });
    }
  }

  return res.json({ message: 'View-once message viewed' });
};

export const editMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const messageId = req.params.messageId;
  const { message, ciphertext, iv, encrypted } = req.body || {};

  const finalMessage = ciphertext || message;
  if (!conversationId || !messageId) {
    return sendError(res, 400, 'Conversation id and message id are required');
  }
  if (!isNonEmptyString(finalMessage)) {
    return sendError(res, 400, 'Message is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [rows] = await pool.execute(
    `SELECT sender_id, read_at, view_once, deleted_for_all_at
     FROM messages
     WHERE id = :id AND conversation_id = :conversation_id
     LIMIT 1`,
    { id: messageId, conversation_id: conversationId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Message not found');
  }

  const existing = rows[0];
  if (existing.sender_id !== userId) {
    return sendError(res, 403, 'You can only edit your own messages');
  }
  if (existing.view_once) {
    return sendError(res, 400, 'View-once messages cannot be edited');
  }
  if (existing.deleted_for_all_at) {
    return sendError(res, 400, 'Deleted messages cannot be edited');
  }

  if (existing.read_at) {
    const readAt = new Date(existing.read_at).getTime();
    if (Date.now() - readAt > 60 * 60 * 1000) {
      return sendError(res, 403, 'Messages can only be edited within 1 hour of being read');
    }
  }

  await pool.execute(
    `UPDATE messages
     SET body = :body,
         iv = :iv,
         is_encrypted = :is_encrypted,
         edited_at = NOW()
     WHERE id = :id`,
    {
      id: messageId,
      body: finalMessage.trim(),
      iv: iv || null,
      is_encrypted: encrypted ? 1 : 0
    }
  );

  const payload = {
    id: messageId,
    text: finalMessage.trim(),
    iv: iv || null,
    encrypted: Boolean(encrypted),
    editedAt: new Date().toISOString()
  };

  const io = req.app.get('io');
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message_edited', {
      conversationId,
      message: payload
    });
  }

  return res.json({ message: 'Message updated', ...payload });
};

export const deleteMessage = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const messageId = req.params.messageId;
  const scope = req.query.scope === 'all' ? 'all' : 'self';

  if (!conversationId || !messageId) {
    return sendError(res, 400, 'Conversation id and message id are required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [rows] = await pool.execute(
    `SELECT sender_id, read_at, deleted_for_all_at
     FROM messages
     WHERE id = :id AND conversation_id = :conversation_id
     LIMIT 1`,
    { id: messageId, conversation_id: conversationId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Message not found');
  }

  const existing = rows[0];
  if (existing.deleted_for_all_at && scope === 'all') {
    return sendError(res, 400, 'Message already deleted for everyone');
  }
  if (scope === 'all') {
    if (existing.sender_id !== userId) {
      return sendError(res, 403, 'You can only delete your own messages for everyone');
    }
    if (existing.read_at) {
      const readAt = new Date(existing.read_at).getTime();
      if (Date.now() - readAt > 60 * 60 * 1000) {
        return sendError(res, 403, 'Messages can only be deleted for everyone within 1 hour of being read');
      }
    }

    await pool.execute(
      `UPDATE messages
       SET deleted_for_all_at = NOW()
       WHERE id = :id`,
      { id: messageId }
    );

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message_deleted', {
        conversationId,
        messageId,
        deletedAt: new Date().toISOString()
      });
    }

    return res.json({ message: 'Message deleted for everyone' });
  }

  if (existing.sender_id === userId) {
    await pool.execute(
      `UPDATE messages
       SET deleted_for_sender_at = NOW()
       WHERE id = :id`,
      { id: messageId }
    );
  } else {
    await pool.execute(
      `UPDATE messages
       SET deleted_for_recipient_at = NOW()
       WHERE id = :id`,
      { id: messageId }
    );
  }

  return res.json({ message: 'Message deleted for you' });
};

export const getConversationPeer = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;

  const [groupRows] = await pool.execute(
    `SELECT g.id, g.name, g.is_private, g.avatar, g.banner,
            (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id AND gm.status = 'active') AS member_count
     FROM groups g
     WHERE g.conversation_id = :conversation_id
     LIMIT 1`,
    { conversation_id: conversationId }
  );

  if (groupRows.length) {
    const group = groupRows[0];
    const [memberships] = await pool.execute(
      `SELECT role, status FROM group_members
       WHERE group_id = :group_id AND user_id = :user_id AND status = 'active'
       LIMIT 1`,
      { group_id: group.id, user_id: userId }
    );
    if (!memberships.length) {
      return sendError(res, 404, 'Conversation not found');
    }
    await pool.execute(
      `INSERT IGNORE INTO conversation_participants (conversation_id, user_id)
       VALUES (:conversation_id, :user_id)`,
      { conversation_id: conversationId, user_id: userId }
    );
    return res.json({
      id: group.id,
      name: group.name,
      avatar: group.avatar || null,
      verified: false,
      isVerifiedBadge: false,
      badgeStatus: 'none',
      isModerator: false,
      isAdmin: false,
      online: false,
      publicKey: null,
      streakCount: 0,
      isGroup: true,
      isPrivate: Boolean(group.is_private),
      memberCount: Number(group.member_count || 0),
      banner: group.banner || null
    });
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  const [rows] = await pool.execute(
    `SELECT u.id, u.name, u.avatar, u.verified,
            CASE
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW()
              THEN 1 ELSE 0
            END AS is_verified_badge_active,
            CASE
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 'active'
              WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at <= NOW() THEN 'expired'
              ELSE 'none'
            END AS badge_status,
            u.is_moderator, u.is_admin, uk.public_key,
            CASE
              WHEN c.last_mutual_at IS NULL THEN 0
              WHEN TIMESTAMPDIFF(HOUR, c.last_mutual_at, NOW()) >= 24 THEN 0
              ELSE c.streak_count
            END AS streak_count,
            CASE
              WHEN c.last_mutual_at IS NULL THEN 0
              WHEN TIMESTAMPDIFF(HOUR, c.last_mutual_at, NOW()) >= 24 THEN 0
              WHEN (CASE WHEN u.is_verified_badge = 1 AND u.verified_badge_expires_at > NOW() THEN 1 ELSE 0 END) = 1
                OR (CASE WHEN cu.is_verified_badge = 1 AND cu.verified_badge_expires_at > NOW() THEN 1 ELSE 0 END) = 1
                THEN c.streak_count
              WHEN c.streak_count >= 3 THEN c.streak_count
              ELSE 0
            END AS effective_streak_count
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN user_keys uk ON uk.user_id = u.id
     JOIN conversations c ON c.id = cp.conversation_id
     JOIN users cu ON cu.id = :user_id
     WHERE cp.conversation_id = :conversation_id AND cp.user_id <> :user_id
     LIMIT 1`,
    { conversation_id: conversationId, user_id: userId }
  );

  if (!rows.length) {
    return sendError(res, 404, 'Peer not found');
  }

  const peer = rows[0];
  return res.json({
    id: peer.id,
    name: peer.name,
    avatar: peer.avatar || null,
    verified: Boolean(peer.verified),
    isVerifiedBadge: Boolean(peer.is_verified_badge_active),
    badgeStatus: peer.badge_status,
    isModerator: Boolean(peer.is_moderator),
    isAdmin: Boolean(peer.is_admin),
    online: isUserOnline(peer.id),
    publicKey: peer.public_key || null,
    streakCount: Number(peer.effective_streak_count || 0)
  });
};

const allowedAttachmentMimes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'video/mp4',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/x-wav',
  'application/ogg',
  'audio/x-opus+ogg',
  'audio/mp4'
]);

const allowedAttachmentKinds = new Set(['media', 'document', 'audio', 'voice']);

export const uploadAttachment = async (req, res) => {
  const userId = req.user?.id;
  const conversationId = req.params.id;
  const { fileType, fileName, kind } = req.body || {};
  const normalizedType = typeof fileType === 'string' ? fileType.toLowerCase() : '';

  if (!conversationId) {
    return sendError(res, 400, 'Conversation id is required');
  }

  const isParticipant = await ensureParticipant(userId, conversationId);
  if (!isParticipant) {
    return sendError(res, 404, 'Conversation not found');
  }

  if (!req.file) {
    return sendError(res, 400, 'File is required');
  }

  if (!normalizedType || !allowedAttachmentMimes.has(normalizedType)) {
    safeUnlink(req.file.path);
    return sendError(res, 400, 'Unsupported file type');
  }

  if (kind && !allowedAttachmentKinds.has(kind)) {
    safeUnlink(req.file.path);
    return sendError(res, 400, 'Unsupported attachment kind');
  }

  const relativePath = `/uploads/messages/${path.basename(req.file.path)}`;
  const attachmentId = uuid();

  await pool.execute(
    `INSERT INTO message_attachments
      (id, conversation_id, user_id, url, size, file_type, file_name, kind)
     VALUES
      (:id, :conversation_id, :user_id, :url, :size, :file_type, :file_name, :kind)`,
    {
      id: attachmentId,
      conversation_id: conversationId,
      user_id: userId,
      url: relativePath,
      size: req.file.size || 0,
      file_type: normalizedType || null,
      file_name: fileName || req.file.originalname || 'attachment',
      kind: kind || 'document'
    }
  );

  return res.status(201).json({
    id: attachmentId,
    url: relativePath,
    size: req.file.size,
    fileType: normalizedType,
    fileName: fileName || req.file.originalname || 'attachment',
    kind: kind || 'document'
  });
};

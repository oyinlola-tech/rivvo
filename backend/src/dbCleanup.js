import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRoot = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');
const attachmentRetentionDays = Number(process.env.ATTACHMENT_RETENTION_DAYS || 365);

const safeUnlink = (relativeUrl) => {
  if (!relativeUrl || typeof relativeUrl !== 'string') return;
  if (!relativeUrl.startsWith('/uploads/')) return;
  const normalized = relativeUrl.replace(/^\/uploads\//, '');
  const target = path.resolve(uploadsRoot, normalized);
  if (!target.startsWith(uploadsRoot)) return;
  fs.unlink(target, () => {});
};

const runCleanup = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [expiredStatuses] = await connection.execute(
      `SELECT id, media_url
       FROM statuses
       WHERE expires_at < NOW()`
    );
    for (const row of expiredStatuses) {
      if (row.media_url) {
        safeUnlink(row.media_url);
      }
    }

    const [orphanAttachments] = await connection.execute(
      `SELECT ma.url
       FROM message_attachments ma
       LEFT JOIN conversations c ON c.id = ma.conversation_id
       LEFT JOIN users u ON u.id = ma.user_id
       WHERE c.id IS NULL OR u.id IS NULL`
    );
    for (const row of orphanAttachments) {
      safeUnlink(row.url);
    }

    if (Number.isFinite(attachmentRetentionDays) && attachmentRetentionDays > 0) {
      const [expiredAttachments] = await connection.execute(
        `SELECT url
         FROM message_attachments
         WHERE created_at < DATE_SUB(NOW(), INTERVAL :days DAY)`,
        { days: attachmentRetentionDays }
      );
      for (const row of expiredAttachments) {
        safeUnlink(row.url);
      }
    }

    const steps = [
      {
        label: 'otps -> users',
        sql: `DELETE o FROM otps o
              LEFT JOIN users u ON u.id = o.user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'conversation_participants -> conversations',
        sql: `DELETE cp FROM conversation_participants cp
              LEFT JOIN conversations c ON c.id = cp.conversation_id
              WHERE c.id IS NULL`
      },
      {
        label: 'conversation_participants -> users',
        sql: `DELETE cp FROM conversation_participants cp
              LEFT JOIN users u ON u.id = cp.user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'messages -> conversations',
        sql: `DELETE m FROM messages m
              LEFT JOIN conversations c ON c.id = m.conversation_id
              WHERE c.id IS NULL`
      },
      {
        label: 'messages -> users',
        sql: `DELETE m FROM messages m
              LEFT JOIN users u ON u.id = m.sender_id
              WHERE u.id IS NULL`
      },
      {
        label: 'message_attachments -> conversations/users',
        sql: `DELETE ma FROM message_attachments ma
              LEFT JOIN conversations c ON c.id = ma.conversation_id
              LEFT JOIN users u ON u.id = ma.user_id
              WHERE c.id IS NULL OR u.id IS NULL`
      },
      ...(Number.isFinite(attachmentRetentionDays) && attachmentRetentionDays > 0
        ? [
            {
              label: 'message_attachments expired',
              sql: `DELETE FROM message_attachments
                    WHERE created_at < DATE_SUB(NOW(), INTERVAL ${Math.floor(
                      attachmentRetentionDays
                    )} DAY)`
            }
          ]
        : []),
      {
        label: 'status_views -> statuses',
        sql: `DELETE sv FROM status_views sv
              LEFT JOIN statuses s ON s.id = sv.status_id
              WHERE s.id IS NULL`
      },
      {
        label: 'statuses expired',
        sql: `DELETE FROM statuses WHERE expires_at < NOW()`
      },
      {
        label: 'contacts.user_id -> users',
        sql: `DELETE c FROM contacts c
              LEFT JOIN users u ON u.id = c.user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'contacts.contact_id -> users',
        sql: `DELETE c FROM contacts c
              LEFT JOIN users u ON u.id = c.contact_id
              WHERE u.id IS NULL`
      },
      {
        label: 'calls.caller_id -> users',
        sql: `DELETE c FROM calls c
              LEFT JOIN users u ON u.id = c.caller_id
              WHERE u.id IS NULL`
      },
      {
        label: 'calls.callee_id -> users',
        sql: `DELETE c FROM calls c
              LEFT JOIN users u ON u.id = c.callee_id
              WHERE u.id IS NULL`
      },
      {
        label: 'reports.reported_user_id -> users',
        sql: `DELETE r FROM reports r
              LEFT JOIN users u ON u.id = r.reported_user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'reports.reported_by_id -> users',
        sql: `DELETE r FROM reports r
              LEFT JOIN users u ON u.id = r.reported_by_id
              WHERE u.id IS NULL`
      },
      {
        label: 'refresh_tokens -> users',
        sql: `DELETE rt FROM refresh_tokens rt
              LEFT JOIN users u ON u.id = rt.user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'admin_audit_logs -> users',
        sql: `DELETE al FROM admin_audit_logs al
              LEFT JOIN users u ON u.id = al.admin_id
              WHERE u.id IS NULL`
      },
      {
        label: 'verification_payments stale pending',
        sql: `UPDATE verification_payments
              SET status = 'failed'
              WHERE status = 'pending'
                AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
      },
      {
        label: 'verification_payments stale review',
        sql: `UPDATE verification_payments
              SET review_status = 'rejected',
                  rejection_reason = 'Review expired'
              WHERE status = 'successful'
                AND review_status = 'pending'
                AND created_at < DATE_SUB(NOW(), INTERVAL 14 DAY)`
      },
      {
        label: 'verification_payment_locks non-pending review',
        sql: `DELETE vpl FROM verification_payment_locks vpl
              JOIN verification_payments vp
                ON vp.user_id = vpl.user_id
              WHERE vp.review_status IS NOT NULL
                AND vp.review_status <> 'pending'`
      },
      {
        label: 'verification_payment_locks stale',
        sql: `DELETE vpl FROM verification_payment_locks vpl
              LEFT JOIN verification_payments vp
                ON vp.user_id = vpl.user_id
               AND (
                 vp.status = 'pending'
                 OR (vp.status = 'successful' AND vp.review_status = 'pending')
               )
              WHERE vp.user_id IS NULL`
      },
      {
        label: 'verification_payments -> users',
        sql: `DELETE vp FROM verification_payments vp
              LEFT JOIN users u ON u.id = vp.user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'user_keys -> users',
        sql: `DELETE uk FROM user_keys uk
              LEFT JOIN users u ON u.id = uk.user_id
              WHERE u.id IS NULL`
      },
      {
        label: 'conversations without participants',
        sql: `DELETE c FROM conversations c
              LEFT JOIN conversation_participants cp ON cp.conversation_id = c.id
              WHERE cp.conversation_id IS NULL`
      }
    ];

    const results = [];
    for (const step of steps) {
      const [result] = await connection.execute(step.sql);
      results.push({ label: step.label, affectedRows: result.affectedRows || 0 });
    }

    await connection.commit();

    console.log('DB cleanup complete:');
    for (const row of results) {
      console.log(`- ${row.label}: ${row.affectedRows} rows`);
    }
  } catch (error) {
    await connection.rollback();
    console.error('DB cleanup failed:', error.message);
    throw error;
  } finally {
    connection.release();
  }
};

runCleanup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

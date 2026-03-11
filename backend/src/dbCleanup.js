import pool from '../config/db.js';

const runCleanup = async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

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

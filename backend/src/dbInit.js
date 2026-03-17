import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import pool from '../config/db.js';
import env from '../config/env.js';

export const initDb = async () => {
  if (env.db?.database) {
    const connection = await mysql.createConnection({
      host: env.db.host,
      port: env.db.port,
      user: env.db.user,
      password: env.db.password
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\``);
    await connection.end();
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(32) UNIQUE NULL,
      username_updated_at DATETIME NULL,
      avatar VARCHAR(512) NULL,
      verified TINYINT(1) DEFAULT 0,
      is_verified_badge TINYINT(1) DEFAULT 0,
      verified_badge_expires_at DATETIME NULL,
      is_moderator TINYINT(1) DEFAULT 0,
      is_admin TINYINT(1) DEFAULT 0,
      status ENUM('active', 'suspended') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  if (env.admin?.email && env.admin?.password) {
    const [adminRows] = await pool.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [env.admin.email]
    );
    if (!adminRows.length) {
      const passwordHash = await bcrypt.hash(env.admin.password, 10);
      await pool.query(
        `INSERT INTO users
          (id, email, phone, password_hash, name, username, avatar, verified, is_verified_badge, is_moderator, is_admin, status)
         VALUES (?, ?, NULL, ?, ?, NULL, NULL, 1, 0, 1, 1, 'active')`,
        [uuid(), env.admin.email, passwordHash, env.admin.name]
      );
      console.log('Main admin account created');
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      code VARCHAR(6) NOT NULL,
      purpose VARCHAR(32) DEFAULT 'email_verification',
      expires_at DATETIME NOT NULL,
      used TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otps_user (user_id),
      INDEX idx_otps_purpose (purpose),
      INDEX idx_otps_expires (expires_at)
    )
  `);

  try {
    await pool.query(`
      ALTER TABLE otps
      ADD COLUMN purpose VARCHAR(32) DEFAULT 'email_verification'
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE otps
      ADD INDEX idx_otps_purpose (purpose)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id CHAR(36) PRIMARY KEY,
      streak_count INT DEFAULT 0,
      last_mutual_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      PRIMARY KEY (conversation_id, user_id),
      INDEX idx_conv_user (user_id)
    )
  `);

  try {
    await pool.query(`
      ALTER TABLE conversation_participants
      ADD COLUMN last_read_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE conversation_participants
      ADD COLUMN last_message_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id CHAR(36) PRIMARY KEY,
      conversation_id CHAR(36) NOT NULL,
      sender_id CHAR(36) NOT NULL,
      body TEXT NOT NULL,
      iv VARCHAR(64) NULL,
      is_encrypted TINYINT(1) DEFAULT 0,
      delivered_at DATETIME NULL,
      edited_at DATETIME NULL,
      deleted_for_sender_at DATETIME NULL,
      deleted_for_recipient_at DATETIME NULL,
      deleted_for_all_at DATETIME NULL,
      read_at DATETIME NULL,
      view_once TINYINT(1) DEFAULT 0,
      view_once_viewed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_conv (conversation_id),
      INDEX idx_messages_created (created_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_attachments (
      id CHAR(36) PRIMARY KEY,
      conversation_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      url VARCHAR(512) NOT NULL,
      size BIGINT DEFAULT 0,
      file_type VARCHAR(128) NULL,
      file_name VARCHAR(255) NULL,
      kind VARCHAR(32) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_attachments_user (user_id),
      INDEX idx_attachments_conv (conversation_id)
    )
  `);

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN iv VARCHAR(64) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE conversations
      ADD COLUMN streak_count INT DEFAULT 0
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE conversations
      ADD COLUMN last_mutual_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN is_encrypted TINYINT(1) DEFAULT 0
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN read_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN delivered_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN edited_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN deleted_for_sender_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN deleted_for_recipient_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN deleted_for_all_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN view_once TINYINT(1) DEFAULT 0
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD COLUMN view_once_viewed_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      user_id CHAR(36) NOT NULL,
      contact_id CHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, contact_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_requests (
      id CHAR(36) PRIMARY KEY,
      requester_id CHAR(36) NOT NULL,
      recipient_id CHAR(36) NOT NULL,
      status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
      read_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_contact_request (requester_id, recipient_id),
      INDEX idx_contact_request_recipient (recipient_id),
      INDEX idx_contact_request_requester (requester_id)
    )
  `);

  try {
    await pool.query(`
      ALTER TABLE contact_requests
      ADD COLUMN read_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id CHAR(36) PRIMARY KEY,
      caller_id CHAR(36) NOT NULL,
      callee_id CHAR(36) NOT NULL,
      type ENUM('audio', 'video') NOT NULL,
      status ENUM('completed', 'missed', 'ongoing') DEFAULT 'completed',
      duration INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_calls_created (created_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id CHAR(36) PRIMARY KEY,
      reported_user_id CHAR(36) NOT NULL,
      reported_by_id CHAR(36) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      description TEXT NULL,
      type ENUM('user', 'message') DEFAULT 'user',
      reported_message_id CHAR(36) NULL,
      conversation_id CHAR(36) NULL,
      assigned_moderator_id CHAR(36) NULL,
      resolved_by_id CHAR(36) NULL,
      resolved_at DATETIME NULL,
      status ENUM('pending', 'resolved') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS report_messages (
      id CHAR(36) PRIMARY KEY,
      report_id CHAR(36) NOT NULL,
      message_id CHAR(36) NOT NULL,
      sender_id CHAR(36) NOT NULL,
      body TEXT NOT NULL,
      iv VARCHAR(64) NULL,
      is_encrypted TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_report_messages_report (report_id),
      INDEX idx_report_messages_message (message_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocks (
      blocker_id CHAR(36) NOT NULL,
      blocked_id CHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (blocker_id, blocked_id),
      INDEX idx_blocks_blocker (blocker_id),
      INDEX idx_blocks_blocked (blocked_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS statuses (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      text TEXT NULL,
      media_url VARCHAR(512) NULL,
      media_type VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      INDEX idx_status_user (user_id),
      INDEX idx_status_expires (expires_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS status_views (
      id CHAR(36) PRIMARY KEY,
      status_id CHAR(36) NOT NULL,
      viewer_id CHAR(36) NOT NULL,
      viewed_at DATETIME NOT NULL,
      UNIQUE KEY uq_status_views (status_id, viewer_id),
      INDEX idx_status_views_viewer (viewer_id),
      INDEX idx_status_views_status (status_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS status_mutes (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      muted_user_id CHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_status_mutes (user_id, muted_user_id),
      INDEX idx_status_mutes_user (user_id),
      INDEX idx_status_mutes_muted (muted_user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_keys (
      user_id CHAR(36) PRIMARY KEY,
      public_key TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_invites (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      token VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_invite_token (token),
      INDEX idx_user_invite_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS groups (
      id CHAR(36) PRIMARY KEY,
      conversation_id CHAR(36) NULL,
      owner_id CHAR(36) NOT NULL,
      name VARCHAR(120) NOT NULL,
      description TEXT NULL,
      avatar VARCHAR(512) NULL,
      banner VARCHAR(512) NULL,
      is_private TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_groups_owner (owner_id),
      INDEX idx_groups_public (is_private),
      INDEX idx_groups_conversation (conversation_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_members (
      group_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      role ENUM('owner', 'admin', 'member') DEFAULT 'member',
      status ENUM('active', 'pending') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (group_id, user_id),
      INDEX idx_group_members_group (group_id),
      INDEX idx_group_members_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_invites (
      id CHAR(36) PRIMARY KEY,
      group_id CHAR(36) NOT NULL,
      token VARCHAR(64) NOT NULL,
      created_by CHAR(36) NOT NULL,
      is_private TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_group_invite_token (token),
      INDEX idx_group_invite_group (group_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_join_requests (
      id CHAR(36) PRIMARY KEY,
      group_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_by CHAR(36) NULL,
      reviewed_at DATETIME NULL,
      UNIQUE KEY uq_group_join_request (group_id, user_id),
      INDEX idx_group_join_group (group_id),
      INDEX idx_group_join_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS call_links (
      id CHAR(36) PRIMARY KEY,
      token VARCHAR(64) NOT NULL,
      created_by CHAR(36) NOT NULL,
      type ENUM('audio', 'video') NOT NULL,
      scope ENUM('direct', 'group') NOT NULL,
      group_id CHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_call_link_token (token),
      INDEX idx_call_link_group (group_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS device_keys (
      device_id VARCHAR(64) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      public_key TEXT NOT NULL,
      device_name VARCHAR(100) NULL,
      verified_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_device_user (user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME NULL,
      last_used_at DATETIME NULL,
      user_agent VARCHAR(255) NULL,
      ip_address VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_refresh_tokens_hash (token_hash),
      INDEX idx_refresh_user (user_id),
      INDEX idx_refresh_expires (expires_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id CHAR(36) PRIMARY KEY,
      admin_id CHAR(36) NOT NULL,
      action VARCHAR(64) NOT NULL,
      target_id CHAR(36) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_admin (admin_id),
      INDEX idx_audit_created (created_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_settings (
      id CHAR(36) PRIMARY KEY,
      amount DECIMAL(12,2) NOT NULL,
      currency CHAR(3) NOT NULL,
      active TINYINT(1) DEFAULT 1,
      updated_by CHAR(36) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_verification_settings_active (active),
      INDEX idx_verification_settings_updated (updated_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_payments (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      currency CHAR(3) NOT NULL,
      status ENUM('pending', 'successful', 'failed', 'cancelled') DEFAULT 'pending',
      review_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      reviewed_by CHAR(36) NULL,
      reviewed_at DATETIME NULL,
      rejection_reason VARCHAR(255) NULL,
      tx_ref VARCHAR(64) NOT NULL,
      flw_transaction_id VARCHAR(32) NULL,
      flw_status VARCHAR(32) NULL,
      payment_link VARCHAR(512) NULL,
      raw_response JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_verification_payments_tx_ref (tx_ref),
      INDEX idx_verification_payments_user (user_id),
      INDEX idx_verification_payments_status (status),
      INDEX idx_verification_payments_review (review_status)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_payment_locks (
      user_id CHAR(36) PRIMARY KEY,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await pool.query(`
      ALTER TABLE users
      ADD INDEX idx_users_email (email)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN phone VARCHAR(20) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN username VARCHAR(32) UNIQUE NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN username_updated_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN is_verified_badge TINYINT(1) DEFAULT 0
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN verified_badge_expires_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD UNIQUE INDEX uq_users_phone (phone)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD UNIQUE INDEX uq_users_username (username)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE users
      ADD INDEX idx_users_verified_badge_expires (verified_badge_expires_at)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE otps
      ADD CONSTRAINT fk_otps_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE conversation_participants
      ADD CONSTRAINT fk_conv_participant_conversation
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE conversation_participants
      ADD CONSTRAINT fk_conv_participant_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD CONSTRAINT fk_messages_conversation
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE messages
      ADD CONSTRAINT fk_messages_sender
      FOREIGN KEY (sender_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE contacts
      ADD CONSTRAINT fk_contacts_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE contacts
      ADD CONSTRAINT fk_contacts_contact
      FOREIGN KEY (contact_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE calls
      ADD CONSTRAINT fk_calls_caller
      FOREIGN KEY (caller_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE calls
      ADD CONSTRAINT fk_calls_callee
      FOREIGN KEY (callee_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD CONSTRAINT fk_reports_reported
      FOREIGN KEY (reported_user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE user_invites
      ADD CONSTRAINT fk_user_invites_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE groups
      ADD CONSTRAINT fk_groups_owner
      FOREIGN KEY (owner_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE groups
      ADD COLUMN conversation_id CHAR(36) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE groups
      ADD COLUMN avatar VARCHAR(512) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE groups
      ADD COLUMN banner VARCHAR(512) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE groups
      ADD INDEX idx_groups_conversation (conversation_id)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE groups
      ADD CONSTRAINT fk_groups_conversation
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      ON DELETE SET NULL
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE group_members
      ADD CONSTRAINT fk_group_members_group
      FOREIGN KEY (group_id) REFERENCES groups(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE group_members
      ADD CONSTRAINT fk_group_members_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE group_invites
      ADD CONSTRAINT fk_group_invites_group
      FOREIGN KEY (group_id) REFERENCES groups(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE group_join_requests
      ADD CONSTRAINT fk_group_join_group
      FOREIGN KEY (group_id) REFERENCES groups(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD COLUMN type ENUM('user', 'message') DEFAULT 'user'
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD COLUMN reported_message_id CHAR(36) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD COLUMN conversation_id CHAR(36) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD COLUMN assigned_moderator_id CHAR(36) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD COLUMN resolved_by_id CHAR(36) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD COLUMN resolved_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE reports
      ADD CONSTRAINT fk_reports_reporter
      FOREIGN KEY (reported_by_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE refresh_tokens
      ADD CONSTRAINT fk_refresh_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE admin_audit_logs
      ADD CONSTRAINT fk_audit_admin
      FOREIGN KEY (admin_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD CONSTRAINT fk_verification_payments_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD COLUMN review_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD COLUMN reviewed_by CHAR(36) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD COLUMN reviewed_at DATETIME NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD COLUMN rejection_reason VARCHAR(255) NULL
    `);
  } catch (error) {
    // Column likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD INDEX idx_verification_payments_review (review_status)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payments
      ADD UNIQUE INDEX uq_verification_payments_flw_id (flw_transaction_id)
    `);
  } catch (error) {
    // Index likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE verification_payment_locks
      ADD CONSTRAINT fk_verification_payment_locks_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE user_keys
      ADD CONSTRAINT fk_user_keys_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE statuses
      ADD CONSTRAINT fk_statuses_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE status_views
      ADD CONSTRAINT fk_status_views_status
      FOREIGN KEY (status_id) REFERENCES statuses(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE status_views
      ADD CONSTRAINT fk_status_views_viewer
      FOREIGN KEY (viewer_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE status_mutes
      ADD CONSTRAINT fk_status_mutes_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE status_mutes
      ADD CONSTRAINT fk_status_mutes_muted
      FOREIGN KEY (muted_user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }

  try {
    await pool.query(`
      ALTER TABLE device_keys
      ADD CONSTRAINT fk_device_keys_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }
};

import pool from '../config/db.js';

export const initDb = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar VARCHAR(512) NULL,
      verified TINYINT(1) DEFAULT 0,
      is_moderator TINYINT(1) DEFAULT 0,
      is_admin TINYINT(1) DEFAULT 0,
      status ENUM('active', 'suspended') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id CHAR(36) PRIMARY KEY,
      user_id CHAR(36) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      used TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otps_user (user_id),
      INDEX idx_otps_expires (expires_at)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id CHAR(36) PRIMARY KEY,
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id CHAR(36) PRIMARY KEY,
      conversation_id CHAR(36) NOT NULL,
      sender_id CHAR(36) NOT NULL,
      body TEXT NOT NULL,
      iv VARCHAR(64) NULL,
      is_encrypted TINYINT(1) DEFAULT 0,
      read_at DATETIME NULL,
      view_once TINYINT(1) DEFAULT 0,
      view_once_viewed_at DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_conv (conversation_id),
      INDEX idx_messages_created (created_at)
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
      status ENUM('pending', 'resolved') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    CREATE TABLE IF NOT EXISTS user_keys (
      user_id CHAR(36) PRIMARY KEY,
      public_key TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
      ALTER TABLE device_keys
      ADD CONSTRAINT fk_device_keys_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (error) {
    // Constraint likely exists already.
  }
};

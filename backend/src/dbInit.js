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
      INDEX idx_otps_user (user_id)
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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_messages_conv (conversation_id)
    )
  `);

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
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
};

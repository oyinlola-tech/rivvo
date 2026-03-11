import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'rivvo'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'change_this_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Rivvo <no-reply@rivvo.com>'
  },
  callRoomBaseUrl: process.env.CALL_ROOM_BASE_URL || 'http://localhost:5173/call/',
  rateLimit: {
    windowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15),
    max: Number(process.env.RATE_LIMIT_MAX || 100)
  }
};

export default env;

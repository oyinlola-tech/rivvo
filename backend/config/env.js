import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const clientUrls = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!clientUrls.length) {
  clientUrls.push('https://rivvo.telente.site', 'https://www.rivvo.telente.site');
}

const required = (value, fallback) => (value === undefined || value === null || value === '' ? fallback : value);
const toNumber = (value, fallback) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const env = {
  nodeEnv: required(process.env.NODE_ENV, 'production'),
  port: toNumber(process.env.PORT, 3000),
  clientUrl: clientUrls[0],
  clientUrls,
  db: {
    host: process.env.DB_HOST,
    port: toNumber(process.env.DB_PORT, 3306),
    user: required(process.env.DB_USER, ''),
    password: required(process.env.DB_PASSWORD, ''),
    database: required(process.env.DB_NAME, '')
  },
  jwt: {
    secret: required(process.env.JWT_SECRET, ''),
    expiresIn: required(process.env.JWT_EXPIRES_IN, '1h'),
    issuer: required(process.env.JWT_ISSUER, 'rivvo'),
    audience: required(process.env.JWT_AUDIENCE, 'rivvo-client')
  },
  refreshTokenExpiresDays: toNumber(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 7),
  otpExpiresMinutes: toNumber(process.env.OTP_EXPIRES_MINUTES, 10),
  smtp: {
    host: process.env.SMTP_HOST,
    port: toNumber(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  },
  callRoomBaseUrl: process.env.CALL_ROOM_BASE_URL,
  callJoinBaseUrl: process.env.CALL_JOIN_BASE_URL,
  rateLimit: {
    windowMinutes: toNumber(process.env.RATE_LIMIT_WINDOW_MINUTES, 15),
    authMax: toNumber(process.env.RATE_LIMIT_AUTH_MAX, 10),
    apiMax: toNumber(process.env.RATE_LIMIT_API_MAX, 300),
    messageMax: toNumber(process.env.RATE_LIMIT_MESSAGES_MAX || process.env.RATE_LIMIT_API_MAX, 300),
    uploadsMax: toNumber(process.env.RATE_LIMIT_UPLOADS_MAX || process.env.RATE_LIMIT_API_MAX, 300)
  },
  flutterwave: {
    baseUrl: process.env.FLW_BASE_URL || 'https://api.flutterwave.com',
    publicKey: process.env.FLW_PUBLIC_KEY,
    secretKey: process.env.FLW_SECRET_KEY,
    webhookSecret: process.env.FLW_WEBHOOK_SECRET,
    redirectUrl: process.env.FLW_REDIRECT_URL
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Main Admin'
  },
  cors: {
    publicUrls: (process.env.CORS_PUBLIC_URLS || process.env.CLIENT_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    adminUrls: (process.env.CORS_ADMIN_URLS || process.env.CLIENT_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  },
  socket: {
    membershipCacheTtlMs: toNumber(process.env.SOCKET_MEMBERSHIP_CACHE_TTL_MS, 30000),
    rateLimitWindowMs: toNumber(process.env.SOCKET_RATE_LIMIT_WINDOW_MS, 10000),
    rateLimitMax: toNumber(process.env.SOCKET_RATE_LIMIT_MAX, 30)
  }
};

if (!env.jwt.secret) {
  throw new Error('JWT_SECRET is required');
}
if (!env.db.host || !env.db.user || !env.db.database) {
  throw new Error('Database configuration is incomplete');
}

export default env;

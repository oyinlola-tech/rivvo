import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const clientUrls = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

if (!clientUrls.length) {
  clientUrls.push('https://rivvo.telente.site', 'https://www.rivvo.telente.site');
}

const env = {
  nodeEnv: process.env.NODE_ENV ,
  port: Number(process.env.PORT),
  clientUrl: clientUrls[0],
  clientUrls,
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ),
    user: process.env.DB_USER ,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  jwt: {
    secret: process.env.JWT_SECRET ,
    expiresIn: process.env.JWT_EXPIRES_IN
  },
  refreshTokenExpiresDays: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS),
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ),
    user: process.env.SMTP_USER ,
    pass: process.env.SMTP_PASS ,
    from: process.env.SMTP_FROM 
  },
  callRoomBaseUrl: process.env.CALL_ROOM_BASE_URL,
  rateLimit: {
    windowMinutes: Number(process.env.RATE_LIMIT_WINDOW_MINUTES ),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX),
    apiMax: Number(process.env.RATE_LIMIT_API_MAX)
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
  }
};

export default env;

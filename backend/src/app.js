import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from '../config/env.js';
import routes from '../routes/index.js';
import errorHandler from '../middleware/error.js';
import { apiRateLimiter } from '../middleware/rateLimit.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '..', 'uploads');
const frontendDistPath = path.join(__dirname, '..', '..', 'dist');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false
  })
);
const resolveCorsOrigins = (path) => {
  const safePath = path || '';
  if (safePath.startsWith('/api/admin')) {
    return env.cors.adminUrls.length ? env.cors.adminUrls : env.clientUrls;
  }
  if (safePath.startsWith('/api')) {
    return env.cors.publicUrls.length ? env.cors.publicUrls : env.clientUrls;
  }
  return env.clientUrls;
};

app.use(
  cors((req, callback) => {
    const allowlist = resolveCorsOrigins(req.path);
    const origin = req.headers.origin;
    if (!origin) {
      if (env.nodeEnv === 'production') {
        return callback(new Error('Not allowed by CORS'));
      }
      return callback(null, { origin: true });
    }
    const allowed = allowlist.includes(origin);
    return callback(null, {
      origin: allowed,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400
    });
  })
);
app.use(
  express.json({
    limit: '1mb',
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    }
  })
);
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use(
  '/uploads',
  express.static(uploadsPath, {
    setHeaders: (res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  })
);

app.use('/api', routes);

// Rate-limit static file access and SPA fallback to avoid filesystem DoS.
app.use(apiRateLimiter);
app.use(express.static(frontendDistPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  return res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found' });
});

app.use(errorHandler);

export default app;

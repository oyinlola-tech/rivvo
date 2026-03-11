import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import env from '../config/env.js';
import routes from '../routes/index.js';
import errorHandler from '../middleware/error.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientUrl,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route not found' });
});

app.use(errorHandler);

export default app;

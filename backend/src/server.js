import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app.js';
import env from '../config/env.js';
import { initDb } from './dbInit.js';
import { setUserOnline, setUserOffline } from '../services/presenceService.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientUrl,
    credentials: true
  }
});

app.set('io', io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    socket.user = payload;
  } catch (error) {
    socket.user = null;
  }

  return next();
});

io.on('connection', (socket) => {
  const userId = socket.user?.id;

  if (userId) {
    setUserOnline(userId);
    socket.join(`user:${userId}`);
    io.emit('user_online', { userId });
  }

  socket.on('join_conversation', ({ conversationId }) => {
    if (conversationId) {
      socket.join(`conversation:${conversationId}`);
    }
  });

  socket.on('leave_conversation', ({ conversationId }) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });

  socket.on('typing', ({ conversationId, userId: typingUserId }) => {
    if (conversationId) {
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId: typingUserId || userId
      });
    }
  });

  socket.on('disconnect', () => {
    if (userId) {
      setUserOffline(userId);
      io.emit('user_offline', { userId });
    }
  });
});

const start = async () => {
  await initDb();

  server.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
};

start();

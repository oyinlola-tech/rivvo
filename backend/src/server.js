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
    origin: env.clientUrls,
    credentials: true
  }
});

app.set('io', io);

io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    socket.user = null;
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    socket.user = payload;
  } catch (error) {
    return next(new Error('Unauthorized'));
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
    const roomId = socket.data.callRoomId;
    if (roomId) {
      socket.to(roomId).emit('call:peer-left', { peerId: socket.id });
    }
    if (userId) {
      setUserOffline(userId);
      io.emit('user_offline', { userId });
    }
  });

  socket.on('call:join', async ({ roomId, name }) => {
    if (!roomId) return;
    const roomKey = `call:${roomId}`;
    const room = io.sockets.adapter.rooms.get(roomKey);
    if (room && room.size >= 10) {
      socket.emit('call:full');
      return;
    }

    socket.join(roomKey);
    socket.data.callRoomId = roomKey;
    socket.data.displayName = name || 'Guest';

    const sockets = await io.in(roomKey).fetchSockets();
    const peers = sockets
      .filter((s) => s.id !== socket.id)
      .map((s) => ({
        peerId: s.id,
        name: s.data.displayName || 'Guest'
      }));

    socket.emit('call:peers', peers);
    socket.to(roomKey).emit('call:peer-joined', {
      peerId: socket.id,
      name: socket.data.displayName || 'Guest'
    });
  });

  socket.on('call:leave', () => {
    const roomId = socket.data.callRoomId;
    if (!roomId) return;
    socket.leave(roomId);
    socket.to(roomId).emit('call:peer-left', { peerId: socket.id });
    socket.data.callRoomId = null;
  });

  socket.on('call:signal', ({ to, data }) => {
    if (!to || !data) return;
    io.to(to).emit('call:signal', { from: socket.id, data });
  });
});

const start = async () => {
  await initDb();

  server.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
};

start();

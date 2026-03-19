import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import app from './app.js';
import env from '../config/env.js';
import { initDb } from './dbInit.js';
import { setUserOnline, setUserOffline } from '../services/presenceService.js';
import pool from '../config/db.js';

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
    const payload = jwt.verify(token, env.jwt.secret, {
      issuer: env.jwt.issuer,
      audience: env.jwt.audience
    });
    socket.user = payload;
  } catch (error) {
    return next(new Error('Unauthorized'));
  }

  return next();
});

io.on('connection', (socket) => {
  const userId = socket.user?.id;

  const membershipCache = new Map();
  const membershipCacheTtlMs = Number(env.socket?.membershipCacheTtlMs || 30000);

  const rateLimitWindowMs = Number(env.socket?.rateLimitWindowMs || 10000);
  const rateLimitMax = Number(env.socket?.rateLimitMax || 30);
  const rateLimitStore = new Map();

  const getRateKey = (eventName) => `${userId || socket.id}:${eventName}`;
  const isRateLimited = (eventName) => {
    const key = getRateKey(eventName);
    const now = Date.now();
    const state = rateLimitStore.get(key) || { count: 0, resetAt: now + rateLimitWindowMs };
    if (now > state.resetAt) {
      state.count = 0;
      state.resetAt = now + rateLimitWindowMs;
    }
    state.count += 1;
    rateLimitStore.set(key, state);
    return state.count > rateLimitMax;
  };

  const isConversationParticipant = async (conversationId) => {
    if (!conversationId || !userId) return false;
    const cached = membershipCache.get(conversationId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.allowed;
    }
    const [rows] = await pool.execute(
      `SELECT 1
       FROM conversation_participants
       WHERE conversation_id = :conversation_id AND user_id = :user_id
       LIMIT 1`,
      { conversation_id: conversationId, user_id: userId }
    );
    const allowed = rows.length > 0;
    membershipCache.set(conversationId, {
      allowed,
      expiresAt: Date.now() + membershipCacheTtlMs
    });
    return allowed;
  };

  if (userId) {
    setUserOnline(userId);
    socket.join(`user:${userId}`);
    io.emit('user_online', { userId });
  }

  socket.on('join_conversation', async ({ conversationId }) => {
    if (!socket.user?.id) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (isRateLimited('join_conversation')) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }
    if (!conversationId) return;
    const allowed = await isConversationParticipant(conversationId);
    if (!allowed) {
      socket.emit('error', { message: 'Forbidden' });
      return;
    }
    socket.join(`conversation:${conversationId}`);
  });

  socket.on('leave_conversation', async ({ conversationId }) => {
    if (!socket.user?.id) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (isRateLimited('leave_conversation')) {
      socket.emit('error', { message: 'Rate limit exceeded' });
      return;
    }
    if (!conversationId) return;
    const allowed = await isConversationParticipant(conversationId);
    if (!allowed) {
      socket.emit('error', { message: 'Forbidden' });
      return;
    }
    socket.leave(`conversation:${conversationId}`);
  });

  socket.on('typing', async ({ conversationId, userId: typingUserId }) => {
    if (!socket.user?.id) {
      socket.emit('error', { message: 'Unauthorized' });
      return;
    }
    if (isRateLimited('typing')) {
      return;
    }
    if (!conversationId) return;
    const allowed = await isConversationParticipant(conversationId);
    if (!allowed) {
      socket.emit('error', { message: 'Forbidden' });
      return;
    }
    socket.to(`conversation:${conversationId}`).emit('typing', {
      conversationId,
      userId: typingUserId || userId
    });
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
    const isDirectCall = /-/.test(roomId);
    if (isDirectCall && !userId) {
      socket.emit('call:error', { message: 'Unauthorized call join' });
      return;
    }
    const maxParticipants = isDirectCall ? 2 : 10;
    if (room && room.size >= maxParticipants) {
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
      name: socket.data.displayName || 'Guest',
      shouldOffer: true
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

  socket.on('call:ringing', ({ callId, toUserId }) => {
    if (!callId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:ringing', { callId, fromUserId: userId });
  });

  socket.on('call:accept', ({ callId, toUserId }) => {
    if (!callId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:accepted', { callId, fromUserId: userId });
  });

  socket.on('call:decline', ({ callId, toUserId }) => {
    if (!callId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:declined', { callId, fromUserId: userId });
  });

  socket.on('call:cancel', ({ callId, toUserId }) => {
    if (!callId || !toUserId) return;
    io.to(`user:${toUserId}`).emit('call:cancelled', { callId, fromUserId: userId });
  });
});

const start = async () => {
  await initDb();

  server.listen(env.port, () => {
    console.log(`API running on http://localhost:${env.port}`);
  });
};

start();

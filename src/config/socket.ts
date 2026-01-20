import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import redis from './redis';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  // ioredis connects automatically, so we can set up the adapter immediately
  io!.adapter(createAdapter(pubClient as any, subClient as any));
  console.log('✅ Socket.IO Redis adapter connected');

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('subscribe:monitor', (monitorId: string) => {
      socket.join(`monitor:${monitorId}`);
      console.log(`📡 Client ${socket.id} subscribed to monitor ${monitorId}`);
    });

    socket.on('subscribe:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`📡 Client ${socket.id} subscribed to user ${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from './logger';
import { verifyUserAccessToken } from '../utils/jwt';

export interface AuthenticatedSocket extends Socket {
  data: {
    userId: string;
  };
}

/**
 * Initialize Socket.io server
 * This function is called from server.ts
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000
  });

  // ==================== MIDDLEWARE: AUTHENTICATION ====================
  io.use((socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn('[Socket] No token provided');
        return next(new Error('No token provided'));
      }

      // Verify JWT token
      const decoded = verifyUserAccessToken(token) as any;
      if (!decoded || !decoded.userId) {
        logger.warn('[Socket] Invalid token');
        return next(new Error('Invalid token'));
      }

      // Store userId in socket for later use
      socket.data.userId = decoded.userId;
      logger.info(`[Socket Auth] User ${decoded.userId} authenticated (Socket ID: ${socket.id})`);

      next();
    } catch (error: any) {
      logger.error(`[Socket Auth] Error: ${error.message}`);
      next(new Error('Authentication failed'));
    }
  });

  // ==================== CONNECTION HANDLER ====================
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.data.userId;

    // Join user to personal room (e.g., "user:userId")
    // This allows sending notifications only to that user
    socket.join(`user:${userId}`);
    logger.info(`[Socket Connect] User ${userId} connected. Socket ID: ${socket.id}`);

    // ==================== EVENT: ping (keep-alive) ====================
    socket.on('ping', () => {
      socket.emit('pong');
      logger.debug(`[Socket Ping] User ${userId} pinged`);
    });

    // ==================== EVENT: disconnect ====================
    socket.on('disconnect', (reason: string) => {
      logger.info(`[Socket Disconnect] User ${userId} disconnected. Reason: ${reason}`);
    });

    // ==================== EVENT: error ====================
    socket.on('error', (error: any) => {
      logger.error(`[Socket Error] User ${userId}: ${error.message}`);
    });
  });

  // ==================== SERVER EVENTS ====================
  io.engine.on('connection_error', (err) => {
    logger.error('[Socket Engine Error]:', err.message);
  });

  logger.info('✅ Socket.io server initialized');
  return io;
};

/**
 * Helper: Send notification to specific user via Socket.io
 * Use this in queue workers
 *
 * Example:
 * sendNotificationToUser(io, userId, {
 *   type: 'like',
 *   fromUserName: 'John',
 *   message: 'Someone liked your post'
 * });
 */
export const sendNotificationToUser = (
  io: SocketIOServer | null,
  userId: string,
  notification: {
    type: 'like' | 'comment' | 'follow' | 'ride_share';
    fromUserId?: string;
    fromUserName?: string;
    fromUserAvatar?: string;
    postId?: string;
    commentId?: string;
    message: string;
  }
) => {
  if (!io) {
    logger.warn(`[sendNotificationToUser] Socket.io not available`);
    return;
  }

  io.to(`user:${userId}`).emit('notification', {
    ...notification,
    timestamp: new Date(),
    id: `notif_${Date.now()}`
  });

  logger.info(`[sendNotificationToUser] Notification sent to user ${userId}: ${notification.message}`);
};

/**
 * Helper: Send notification to multiple users
 */
export const sendNotificationToUsers = (
  io: SocketIOServer | null,
  userIds: string[],
  notification: {
    type: 'like' | 'comment' | 'follow' | 'ride_share';
    fromUserId?: string;
    fromUserName?: string;
    fromUserAvatar?: string;
    message: string;
  }
) => {
  if (!io) {
    logger.warn(`[sendNotificationToUsers] Socket.io not available`);
    return;
  }

  userIds.forEach((userId) => {
    sendNotificationToUser(io, userId, notification);
  });

  logger.info(`[sendNotificationToUsers] Notifications sent to ${userIds.length} users`);
};

export default initializeSocket;
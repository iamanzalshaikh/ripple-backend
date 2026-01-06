// import { Queue, Worker } from 'bullmq';
// import Redis from 'ioredis';
// import { Server as SocketIOServer } from 'socket.io';
// import logger from '../config/logger.js';
// import Notification from '../models/notification.model';
// import User from '../models/user.model';
// import app from '../app.js';

// // Create ioredis connection for BullMQ
// const bullmqRedis = new Redis({
//   host: process.env.REDIS_HOST || 'localhost',
//   port: parseInt(process.env.REDIS_PORT || '6379'),
//   password: process.env.REDIS_PASSWORD,
//   maxRetriesPerRequest: null,
//   enableReadyCheck: false,
//   retryStrategy: (times) => {
//     const delay = Math.min(times * 50, 2000);
//     return delay;
//   }
// });

// bullmqRedis.on('connect', () => {
//   logger.info('✅ Post Queue Redis connected');
// });

// bullmqRedis.on('error', (err) => {
//   logger.error('❌ Post Queue Redis error:', err);
// });

// /**
//  * BullMQ Queue for post-related jobs
//  */
// export const postQueue = new Queue('post-processing', {
//   connection: bullmqRedis,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: { type: 'exponential', delay: 2000 },
//     removeOnComplete: true,
//     removeOnFail: false
//   }
// });

// /**
//  * Worker that processes post jobs
//  */
// export const postWorker = new Worker(
//   'post-processing',
//   async (job) => {
//     logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

//     try {
//       // Get Socket.io instance from app
//       const io = (app as any).io as SocketIOServer | null;

//       // ==================== JOB: send-notification ====================
//       if (job.name === 'send-notification') {
//         const { type, userId, fromUserId, fromUserName, fromUserAvatar, postId, commentId, message } = job.data;

//         logger.info(`[send-notification] Creating notification for user ${userId}`);

//         // Prevent self-notifications
//         if (userId === fromUserId) {
//           logger.info(`[send-notification] Skipping self-notification`);
//           return { skipped: true };
//         }

//         // STEP 1: Save notification to MongoDB (permanent record)
//         const notification = await Notification.create({
//           userId,
//           type,
//           fromUserId,
//           postId: postId || null,
//           commentId: commentId || null,
//           message: message || 'New activity',
//           read: false
//         });

//         logger.info(`[send-notification] Notification ${notification._id} saved to DB`);

//         // STEP 2: Send real-time notification via Socket.io
//         if (io) {
//           io.to(`user:${userId}`).emit('notification', {
//             _id: notification._id,
//             type,
//             fromUserId,
//             fromUserName,
//             fromUserAvatar,
//             postId,
//             commentId,
//             message,
//             timestamp: new Date(),
//             read: false
//           });

//           logger.info(`[send-notification] Real-time notification sent to user ${userId}`);
//         } else {
//           logger.warn(`[send-notification] Socket.io not available, only saved to DB`);
//         }

//         return { notified: true, realtime: !!io, dbSaved: true };
//       }

//       // ==================== JOB: notify-followers ====================
//       if (job.name === 'notify-followers') {
//         const { postId, userId, userName, userAvatar } = job.data;

//         logger.info(`[notify-followers] User ${userId} shared a post, notifying followers`);

//         // Get user's followers
//         const user = await User.findById(userId).select('followers');
//         if (!user || !user.followers || user.followers.length === 0) {
//           logger.info(`[notify-followers] User ${userId} has no followers`);
//           return { notified: 0 };
//         }

//         const followerIds = user.followers.map((id) => id.toString());
//         logger.info(`[notify-followers] Found ${followerIds.length} followers`);

//         // STEP 1: Create notifications for all followers in DB
//         const notifications = followerIds.map((followerId) => ({
//           userId: followerId,
//           type: 'ride_share',
//           fromUserId: userId,
//           postId,
//           message: `${userName} shared a new post`,
//           read: false
//         }));

//         await Notification.insertMany(notifications);
//         logger.info(`[notify-followers] Created ${notifications.length} notifications in DB`);

//         // STEP 2: Send real-time notifications via Socket.io
//         if (io) {
//           followerIds.forEach((followerId) => {
//             io.to(`user:${followerId}`).emit('notification', {
//               type: 'ride_share',
//               fromUserId: userId,
//               fromUserName: userName,
//               fromUserAvatar: userAvatar,
//               postId,
//               message: `${userName} shared a new post`,
//               timestamp: new Date(),
//               read: false
//             });
//           });

//           logger.info(`[notify-followers] Real-time notifications sent to ${followerIds.length} followers`);
//         } else {
//           logger.warn(`[notify-followers] Socket.io not available, only saved to DB`);
//         }

//         return { notified: followerIds.length, realtime: !!io };
//       }

//       throw new Error(`Unknown job type: ${job.name}`);
//     } catch (error: any) {
//       logger.error(`❌ Job ${job.name} failed:`, error.message);
//       throw error;
//     }
//   },
//   {
//     connection: bullmqRedis,
//     concurrency: 10,
//     settings: {
//       maxStalledCount: 2 as any,
//       stalledInterval: 5000,
//       maxRetriesPerSecond: 100,
//       lockDuration: 30000,
//       lockRenewTime: 15000
//     }
//   }
// );

// // ==================== Event Listeners ====================

// postWorker.on('completed', (job) => {
//   logger.info(`✅ Job ${job.id} (${job.name}) completed`);
// });

// postWorker.on('failed', (job, err) => {
//   logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
// });

// postWorker.on('error', (error) => {
//   logger.error('❌ Worker error:', error);
// });

// export default postQueue;



import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import logger from '../config/logger.js';
import Notification from '../models/notification.model.js';
import User from '../models/user.model.js';
import app from '../app.js';

const bullmqRedis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

bullmqRedis.on('connect', () => {
  logger.info('✅ Post Queue Redis connected');
});

bullmqRedis.on('error', (err) => {
  logger.error('❌ Post Queue Redis error:', err);
});

export const postQueue = new Queue('post-processing', {
  connection: bullmqRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});

export const postWorker = new Worker(
  'post-processing',
  async (job) => {
    logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

    try {
      const io = (app as any).io as SocketIOServer | null;

      if (job.name === 'send-notification') {
        const { type, userId, fromUserId, fromUserName, fromUserAvatar, postId, commentId, commentText, message } = job.data;

        logger.info(`[send-notification] Creating notification for user ${userId}`);

        if (userId === fromUserId) {
          logger.info(`[send-notification] Skipping self-notification`);
          return { skipped: true };
        }

        const notification = await Notification.create({
          userId,
          type,
          fromUserId,
          postId: postId || null,
          commentId: commentId || null,
          commentText: commentText || null, // Store comment text for comment notifications
          message: message || 'New activity',
          read: false
        });

        logger.info(`[send-notification] Notification ${notification._id} saved to DB`);

        if (io) {
          io.to(`user:${userId}`).emit('notification', {
            _id: notification._id,
            type,
            fromUserId,
            fromUserName,
            fromUserAvatar,
            postId,
            commentId,
            commentText: commentText || null, // Include comment text in real-time notification
            message,
            timestamp: new Date(),
            read: false
          });

          logger.info(`[send-notification] Real-time notification sent to user ${userId}`);
        } else {
          logger.warn(`[send-notification] Socket.io not available, only saved to DB`);
        }

        return { notified: true, realtime: !!io, dbSaved: true };
      }

      if (job.name === 'notify-followers') {
        const { postId, userId, userName, userAvatar } = job.data;

        logger.info(`[notify-followers] User ${userId} shared a post, notifying followers`);

        const user = await User.findById(userId).select('followers');
        if (!user || !user.followers || user.followers.length === 0) {
          logger.info(`[notify-followers] User ${userId} has no followers`);
          return { notified: 0 };
        }

        const followerIds = user.followers.map((id) => id.toString());
        logger.info(`[notify-followers] Found ${followerIds.length} followers`);

        const notifications = followerIds.map((followerId) => ({
          userId: followerId,
          type: 'ride_share',
          fromUserId: userId,
          postId,
          message: `${userName} shared a new post`,
          read: false
        }));

        await Notification.insertMany(notifications);
        logger.info(`[notify-followers] Created ${notifications.length} notifications in DB`);

        if (io) {
          followerIds.forEach((followerId) => {
            io.to(`user:${followerId}`).emit('notification', {
              type: 'ride_share',
              fromUserId: userId,
              fromUserName: userName,
              fromUserAvatar: userAvatar,
              postId,
              message: `${userName} shared a new post`,
              timestamp: new Date(),
              read: false
            });
          });

          logger.info(`[notify-followers] Real-time notifications sent to ${followerIds.length} followers`);
        } else {
          logger.warn(`[notify-followers] Socket.io not available, only saved to DB`);
        }

        return { notified: followerIds.length, realtime: !!io };
      }

      throw new Error(`Unknown job type: ${job.name}`);
    } catch (error: any) {
      logger.error(`❌ Job ${job.name} failed:`, error.message);
      throw error;
    }
  },
  {
    connection: bullmqRedis,
    concurrency: 10,
    settings: {
      maxStalledCount: 2 as any,
      stalledInterval: 5000,
      maxRetriesPerSecond: 100,
      lockDuration: 30000,
      lockRenewTime: 15000
    } as any
  }
);

postWorker.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} (${job.name}) completed`);
});

postWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

postWorker.on('error', (error) => {
  logger.error('❌ Worker error:', error);
});

export default postQueue;

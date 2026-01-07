// // import { Queue, Worker } from 'bullmq';
// // import Redis from 'ioredis';
// // import { Server as SocketIOServer } from 'socket.io';
// // import logger from '../config/logger';
// // import RideEvent from '../models/rideEvent.model';
// // import RideEventParticipant from '../models/rideEventParticipant.model';
// // import User from '../models/user.model';
// // import Badge from '../models/badge.model';
// // import Award from '../models/award.model';
// // import Notification from '../models/notification.model';
// // import app from '../app';

// // // Create ioredis connection for BullMQ
// // const bullmqRedis = new Redis({
// //   host: process.env.REDIS_HOST || 'localhost',
// //   port: parseInt(process.env.REDIS_PORT || '6379'),
// //   password: process.env.REDIS_PASSWORD,
// //   maxRetriesPerRequest: null,
// //   enableReadyCheck: false,
// //   retryStrategy: (times) => {
// //     const delay = Math.min(times * 50, 2000);
// //     return delay;
// //   }
// // });

// // bullmqRedis.on('connect', () => {
// //   logger.info('✅ RideEvent Queue Redis connected');
// // });

// // bullmqRedis.on('error', (err) => {
// //   logger.error('❌ RideEvent Queue Redis error:', err);
// // });

// // /**
// //  * BullMQ Queue for ride event jobs
// //  */
// // export const rideEventQueue = new Queue('ride-event-processing', {
// //   connection: bullmqRedis,
// //   defaultJobOptions: {
// //     attempts: 3,
// //     backoff: { type: 'exponential', delay: 2000 },
// //     removeOnComplete: true,
// //     removeOnFail: false
// //   }
// // });

// // /**
// //  * Worker that processes ride event jobs
// //  */
// // export const rideEventWorker = new Worker(
// //   'ride-event-processing',
// //   async (job) => {
// //     logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

// //     try {
// //       const io = (app as any).io as SocketIOServer | null;

// //       // ==================== JOB: process-group-ride ====================
// //       if (job.name === 'process-group-ride') {
// //         const { rideEventId } = job.data;

// //         logger.info(`[process-group-ride] Processing ride event ${rideEventId}`);

// //         const ride = await RideEvent.findById(rideEventId);
// //         if (!ride) {
// //           throw new Error(`Ride ${rideEventId} not found`);
// //         }

// //         // Get all participant stats
// //         const participants = await RideEventParticipant.find({ rideEventId }).lean();

// //         logger.info(`[process-group-ride] Processing ${participants.length} participants`);

// //         // Calculate group stats
// //         const finishedCount = participants.filter((p: any) => p.finishedRide).length;
// //         const avgSpeed =
// //           participants.reduce((sum: number, p: any) => sum + (p.avgSpeed || 0), 0) /
// //             participants.length || 0;
// //         const maxSpeed = Math.max(...participants.map((p: any) => p.maxSpeed || 0), 0);

// //         logger.info(
// //           `[process-group-ride] Stats - Finished: ${finishedCount}, Avg Speed: ${avgSpeed}`
// //         );

// //         // Award group badges
// //         const badgesAwarded = [];

// //         // Badge: Perfect Ride (zero SOS)
// //         const sosCounts = participants.filter((p: any) => p.sosTriggered).length;
// //         if (sosCounts === 0) {
// //           const badge = await Badge.findOne({ code: 'perfect_ride' });
// //           if (badge) {
// //             for (const participant of participants) {
// //               const existingAward = await Award.findOne({
// //                 userId: participant.userId,
// //                 badgeId: badge._id
// //               });
// //               if (!existingAward) {
// //                 await Award.create({
// //                   userId: participant.userId,
// //                   badgeId: badge._id,
// //                   awardedAt: new Date()
// //                 });
// //                 badgesAwarded.push({ userId: participant.userId, badgeCode: 'perfect_ride' });

// //                 // Update user
// //                 await User.updateOne(
// //                   { _id: participant.userId },
// //                   { $addToSet: { badges: badge._id }, $inc: { totalBadges: 1 } }
// //                 );

// //                 logger.info(`[process-group-ride] Badge perfect_ride awarded to ${participant.userId}`);
// //               }
// //             }
// //           }
// //         }

// //         // Badge: Squad Goals (completed group ride)
// //         const badge = await Badge.findOne({ code: 'squad_goals' });
// //         if (badge) {
// //           for (const participant of participants) {
// //             const existingAward = await Award.findOne({
// //               userId: participant.userId,
// //               badgeId: badge._id
// //             });
// //             if (!existingAward) {
// //               await Award.create({
// //                 userId: participant.userId,
// //                 badgeId: badge._id,
// //                 awardedAt: new Date()
// //               });
// //               badgesAwarded.push({ userId: participant.userId, badgeCode: 'squad_goals' });

// //               // Update user
// //               await User.updateOne(
// //                 { _id: participant.userId },
// //                 { $addToSet: { badges: badge._id }, $inc: { totalBadges: 1 } }
// //               );

// //               logger.info(`[process-group-ride] Badge squad_goals awarded to ${participant.userId}`);
// //             }
// //           }
// //         }

// //         // Send notifications to all participants
// //         for (const participant of participants) {
// //           const notif = await Notification.create({
// //             userId: participant.userId,
// //             type: 'ride',
// //             message: `Group ride "${ride.title}" completed! Check out the summary.`,
// //             read: false
// //           });

// //           if (io) {
// //             io.to(`user:${participant.userId}`).emit('notification', {
// //               _id: notif._id,
// //               type: 'ride',
// //               message: `Group ride "${ride.title}" completed!`,
// //               rideEventId: rideEventId,
// //               timestamp: new Date(),
// //               read: false
// //             });
// //           }

// //           logger.info(`[process-group-ride] Notification sent to ${participant.userId}`);
// //         }

// //         logger.info(`[process-group-ride] Ride ${rideEventId} processing complete`);

// //         return {
// //           processed: true,
// //           finishedCount,
// //           avgSpeed: avgSpeed.toFixed(2),
// //           badgesAwarded: badgesAwarded.length
// //         };
// //       }

// //       throw new Error(`Unknown job type: ${job.name}`);
// //     } catch (error: any) {
// //       logger.error(`❌ Job ${job.name} failed:`, error.message);
// //       throw error;
// //     }
// //   },
// //   {
// //     connection: bullmqRedis,
// //     concurrency: 10,
// //     settings: {
// //       maxStalledCount: 2,
// //       stalledInterval: 5000,
// //       maxRetriesPerSecond: 100,
// //       lockDuration: 30000,
// //       lockRenewTime: 15000
// //     }
// //   }
// // );

// // // ==================== Event Listeners ====================

// // rideEventWorker.on('completed', (job) => {
// //   logger.info(`✅ Job ${job.id} (${job.name}) completed`);
// // });

// // rideEventWorker.on('failed', (job, err) => {
// //   logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
// // });

// // rideEventWorker.on('error', (error) => {
// //   logger.error('❌ Worker error:', error);
// // });

// // export default rideEventQueue;




// import { Queue, Worker } from 'bullmq';
// import Redis from 'ioredis';
// import { Server as SocketIOServer } from 'socket.io';
// import logger from '../config/logger';
// import RideEvent from '../models/rideEvent.model';
// import RideEventParticipant from '../models/rideEventParticipant.model';
// import User from '../models/user.model';
// import Badge from '../models/badge.model';
// import Award from '../models/award.model';
// import Notification from '../models/notification.model';
// import app from '../app';

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
//   logger.info('✅ RideEvent Queue Redis connected');
// });

// bullmqRedis.on('error', (err) => {
//   logger.error('❌ RideEvent Queue Redis error:', err);
// });

// /**
//  * BullMQ Queue for ride event jobs
//  */
// export const rideEventQueue = new Queue('ride-event-processing', {
//   connection: bullmqRedis,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: { type: 'exponential', delay: 2000 },
//     removeOnComplete: true,
//     removeOnFail: false
//   }
// });

// /**
//  * Worker that processes ride event jobs
//  */
// export const rideEventWorker = new Worker(
//   'ride-event-processing',
//   async (job) => {
//     logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

//     try {
//       const io = (app as any).io as SocketIOServer | null;

//       // ==================== JOB: process-group-ride ====================
//       if (job.name === 'process-group-ride') {
//         const { rideEventId } = job.data;

//         logger.info(`[process-group-ride] Processing ride event ${rideEventId}`);

//         const ride = await RideEvent.findById(rideEventId);
//         if (!ride) {
//           throw new Error(`Ride ${rideEventId} not found`);
//         }

//         // Get all participant stats
//         const participants = await RideEventParticipant.find({ rideEventId }).lean();

//         logger.info(`[process-group-ride] Processing ${participants.length} participants`);

//         // Calculate group stats
//         const finishedCount = participants.filter((p: any) => p.finishedRide).length;
//         const avgSpeed =
//           participants.reduce((sum: number, p: any) => sum + (p.avgSpeed || 0), 0) /
//             participants.length || 0;
//         const maxSpeed = Math.max(...participants.map((p: any) => p.maxSpeed || 0), 0);

//         logger.info(
//           `[process-group-ride] Stats - Finished: ${finishedCount}, Avg Speed: ${avgSpeed}`
//         );

//         // Award group badges
//         const badgesAwarded = [];

//         // Badge: Perfect Ride (zero SOS)
//         const sosCounts = participants.filter((p: any) => p.sosTriggered).length;
//         if (sosCounts === 0) {
//           const badge = await Badge.findOne({ code: 'perfect_ride' });
//           if (badge) {
//             for (const participant of participants) {
//               const existingAward = await Award.findOne({
//                 userId: participant.userId,
//                 badgeId: badge._id
//               });
//               if (!existingAward) {
//                 await Award.create({
//                   userId: participant.userId,
//                   badgeId: badge._id,
//                   awardedAt: new Date()
//                 });
//                 badgesAwarded.push({ userId: participant.userId, badgeCode: 'perfect_ride' });

//                 // Update user
//                 await User.updateOne(
//                   { _id: participant.userId },
//                   { $addToSet: { badges: badge._id }, $inc: { totalBadges: 1 } }
//                 );

//                 logger.info(`[process-group-ride] Badge perfect_ride awarded to ${participant.userId}`);
//               }
//             }
//           }
//         }

//         // Badge: Squad Goals (completed group ride)
//         const badge = await Badge.findOne({ code: 'squad_goals' });
//         if (badge) {
//           for (const participant of participants) {
//             const existingAward = await Award.findOne({
//               userId: participant.userId,
//               badgeId: badge._id
//             });
//             if (!existingAward) {
//               await Award.create({
//                 userId: participant.userId,
//                 badgeId: badge._id,
//                 awardedAt: new Date()
//               });
//               badgesAwarded.push({ userId: participant.userId, badgeCode: 'squad_goals' });

//               // Update user
//               await User.updateOne(
//                 { _id: participant.userId },
//                 { $addToSet: { badges: badge._id }, $inc: { totalBadges: 1 } }
//               );

//               logger.info(`[process-group-ride] Badge squad_goals awarded to ${participant.userId}`);
//             }
//           }
//         }

//         // Send notifications to all participants
//         for (const participant of participants) {
//           const notif = await Notification.create({
//             userId: participant.userId,
//             type: 'ride',
//             message: `Group ride "${ride.title}" completed! Check out the summary.`,
//             read: false
//           });

//           if (io) {
//             io.to(`user:${participant.userId}`).emit('notification', {
//               _id: notif._id,
//               type: 'ride',
//               message: `Group ride "${ride.title}" completed!`,
//               rideEventId: rideEventId,
//               timestamp: new Date(),
//               read: false
//             });
//           }

//           logger.info(`[process-group-ride] Notification sent to ${participant.userId}`);
//         }

//         logger.info(`[process-group-ride] Ride ${rideEventId} processing complete`);

//         return {
//           processed: true,
//           finishedCount,
//           avgSpeed: avgSpeed.toFixed(2),
//           badgesAwarded: badgesAwarded.length
//         };
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
//       stalledInterval: 5000,
//       maxRetriesPerSecond: 100,
//       lockDuration: 30000,
//       lockRenewTime: 15000
//     }
//   }
// );

// // ==================== Event Listeners ====================

// rideEventWorker.on('completed', (job) => {
//   logger.info(`✅ Job ${job.id} (${job.name}) completed`);
// });

// rideEventWorker.on('failed', (job, err) => {
//   logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
// });

// rideEventWorker.on('error', (error) => {
//   logger.error('❌ Worker error:', error);
// });

// export default rideEventQueue;




import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import logger from '../config/logger.js';
import RideEvent from '../models/rideEvent.model.js';
import RideEventParticipant from '../models/rideEventParticipant.model.js';
import User from '../models/user.model.js';
import Badge from '../models/badge.model.js';
import Award from '../models/award.model.js';
import Notification from '../models/notification.model.js';
import app from '../app.js';

// Create ioredis connection for BullMQ
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
  logger.info('✅ RideEvent Queue Redis connected');
});

bullmqRedis.on('error', (err) => {
  logger.error('❌ RideEvent Queue Redis error:', err);
});

/**
 * BullMQ Queue for ride event jobs
 */
export const rideEventQueue = new Queue('ride-event-processing', {
  connection: bullmqRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * Worker that processes ride event jobs
 */
export const rideEventWorker = new Worker(
  'ride-event-processing',
  async (job) => {
    logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

    try {
      const io = (app as any).io as SocketIOServer | null;

      // ==================== JOB: process-group-ride ====================
      if (job.name === 'process-group-ride') {
        const { rideEventId } = job.data;

        logger.info(`[process-group-ride] Processing ride event ${rideEventId}`);

        const ride = await RideEvent.findById(rideEventId);
        if (!ride) {
          throw new Error(`Ride ${rideEventId} not found`);
        }

        // Get all participant stats
        const participants = await RideEventParticipant.find({ rideEventId }).lean();

        logger.info(`[process-group-ride] Processing ${participants.length} participants`);

        // Calculate group stats
        const finishedCount = participants.filter((p: any) => p.finishedRide).length;
        const avgSpeed =
          participants.reduce((sum: number, p: any) => sum + (p.avgSpeed || 0), 0) /
            participants.length || 0;
        const maxSpeed = Math.max(...participants.map((p: any) => p.maxSpeed || 0), 0);

        logger.info(
          `[process-group-ride] Stats - Finished: ${finishedCount}, Avg Speed: ${avgSpeed}`
        );

        // Award group badges
        const badgesAwarded = [];

        // Badge: Perfect Ride (zero SOS)
        const sosCounts = participants.filter((p: any) => p.sosTriggered).length;
        if (sosCounts === 0) {
          const badge = await Badge.findOne({ code: 'perfect_ride' });
          if (badge) {
            for (const participant of participants) {
              const existingAward = await Award.findOne({
                userId: participant.userId,
                badgeId: badge._id
              });
              if (!existingAward) {
                await Award.create({
                  userId: participant.userId,
                  badgeId: badge._id,
                  awardedAt: new Date()
                });
                badgesAwarded.push({ userId: participant.userId, badgeCode: 'perfect_ride' });

                // Update user
                await User.updateOne(
                  { _id: participant.userId },
                  { $addToSet: { badges: badge._id }, $inc: { totalBadges: 1 } }
                );

                logger.info(`[process-group-ride] Badge perfect_ride awarded to ${participant.userId}`);
              }
            }
          }
        }

        // Badge: Squad Goals (completed group ride)
        const badge = await Badge.findOne({ code: 'squad_goals' });
        if (badge) {
          for (const participant of participants) {
            const existingAward = await Award.findOne({
              userId: participant.userId,
              badgeId: badge._id
            });
            if (!existingAward) {
              await Award.create({
                userId: participant.userId,
                badgeId: badge._id,
                awardedAt: new Date()
              });
              badgesAwarded.push({ userId: participant.userId, badgeCode: 'squad_goals' });

              // Update user
              await User.updateOne(
                { _id: participant.userId },
                { $addToSet: { badges: badge._id }, $inc: { totalBadges: 1 } }
              );

              logger.info(`[process-group-ride] Badge squad_goals awarded to ${participant.userId}`);
            }
          }
        }

        // Send notifications to all participants
        for (const participant of participants) {
          const notif = await Notification.create({
            userId: participant.userId,
            type: 'ride',
            message: `Group ride "${ride.title}" completed! Check out the summary.`,
            read: false
          });

          if (io) {
            io.to(`user:${participant.userId}`).emit('notification', {
              _id: notif._id,
              type: 'ride',
              message: `Group ride "${ride.title}" completed!`,
              rideEventId: rideEventId,
              timestamp: new Date(),
              read: false
            });
          }

          logger.info(`[process-group-ride] Notification sent to ${participant.userId}`);
        }

        logger.info(`[process-group-ride] Ride ${rideEventId} processing complete`);

        return {
          processed: true,
          finishedCount,
          avgSpeed: avgSpeed.toFixed(2),
          badgesAwarded: badgesAwarded.length
        };
      }

      throw new Error(`Unknown job type: ${job.name}`);
    } catch (error: any) {
      logger.error(`❌ Job ${job.name} failed:`, error.message);
      throw error;
    }
  },
  {
    connection: bullmqRedis,
    concurrency: 10
  }
);

// ==================== Event Listeners ====================

rideEventWorker.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} (${job.name}) completed`);
});

rideEventWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

rideEventWorker.on('error', (error) => {
  logger.error('❌ Worker error:', error);
});

export default rideEventQueue;
// import { Queue, Worker } from 'bullmq';
// import Redis from 'ioredis';
// import logger from '../config/logger.js';
// import SOSLog from '../models/soslog.model.js';
// import { sendEmailAlert } from '../config/mail.js';
// // import { sendEmailAlert } from '../services/email.service.js';

// /**
//  * ✅ Create ioredis connection for BullMQ
//  */
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
//   logger.info('✅ [SOS QUEUE] Redis connected');
// });

// bullmqRedis.on('error', (err) => {
//   logger.error('❌ [SOS QUEUE] Redis error:', err);
// });

// /**
//  * ✅ BullMQ Queue for SOS alert processing
//  */
// export const sosQueue = new Queue('sos-alerts', {
//   connection: bullmqRedis,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: { type: 'exponential', delay: 2000 },
//     removeOnComplete: true,
//     removeOnFail: false
//   }
// });

// /**
//  * ✅ Worker that processes SOS alert jobs
//  * Sends email alerts to all emergency contacts
//  */
// export const sosWorker = new Worker(
//   'sos-alerts',
//   async (job) => {
//     logger.info(
//       `[SOS WORKER] 🔄 Processing job: ${job.name} (ID: ${job.id})`
//     );

//     try {
//       if (job.name === 'send-alerts') {
//         const { sosId, userId, location, contacts } = job.data;

//         logger.info(`[SOS] Sending alerts for SOS: ${sosId}`);
//         logger.info(`[SOS] Location: ${location.lat}, ${location.lng}`);
//         logger.info(`[SOS] Contacts to notify: ${contacts.length}`);

//         // Fetch SOS log
//         const sosLog = await SOSLog.findById(sosId);
//         if (!sosLog) {
//           throw new Error(`SOS log ${sosId} not found`);
//         }

//         // Sort by priority
//         const sortedContacts = contacts.sort(
//           (a, b) => a.priority - b.priority
//         );

//         // Send email to each contact
//         for (const contact of sortedContacts) {
//           if (!contact.email) {
//             logger.warn(
//               `[SOS] ⚠️ No email for contact ${contact.name}, skipping`
//             );
//             continue;
//           }

//           try {
//             logger.info(`[SOS] Sending email to ${contact.name}...`);

//             const emailSuccess = await sendEmailAlert(contact.email, {
//               contactName: contact.name,
//               location,
//               liveUrl: `https://herridez.com/live/${sosLog.liveShareToken}`
//             });

//             if (emailSuccess) {
//               sosLog.alerts.push({
//                 contactId: contact._id,
//                 channel: 'email',
//                 sentAt: new Date(),
//                 delivered: true,
//                 acknowledged: false
//               });

//               logger.info(
//                 `[SOS] ✅ Email sent successfully to ${contact.email}`
//               );
//             } else {
//               logger.warn(
//                 `[SOS] ❌ Email failed for ${contact.email}, will retry`
//               );
//             }
//           } catch (error: any) {
//             logger.error(
//               `[SOS] ❌ Error sending email to ${contact.email}: ${error.message}`
//             );
//           }
//         }

//         // Save updated SOS log
//         await sosLog.save();
//         logger.info(`[SOS] ✅ All alerts processed for SOS ${sosId}`);
//         logger.info(`[SOS] Total alerts sent: ${sosLog.alerts.length}`);

//         return {
//           success: true,
//           sosId,
//           totalAlerts: sosLog.alerts.length
//         };
//       }

//       throw new Error(`Unknown job type: ${job.name}`);
//     } catch (error: any) {
//       logger.error(
//         `[SOS WORKER] ❌ Job ${job.name} failed:`,
//         error.message
//       );
//       throw error;
//     }
//   },
//   {
//     connection: bullmqRedis,
//     concurrency: 5,
//     settings: {
//       maxStalledCount: 2,
//       stalledInterval: 5000,
//       maxRetriesPerSecond: 100,
//       lockDuration: 30000,
//       lockRenewTime: 15000
//     }
//   }
// );

// // Event listeners
// sosWorker.on('completed', (job) => {
//   logger.info(`[SOS WORKER] ✅ Job ${job.id} completed successfully`);
// });

// sosWorker.on('failed', (job, err) => {
//   logger.error(`[SOS WORKER] ❌ Job ${job?.id} failed: ${err.message}`);
// });

// sosWorker.on('error', (error) => {
//   logger.error('[SOS WORKER] ❌ Worker error:', error);
// });

// export default sosQueue;



import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import logger from '../config/logger.js';
import SOSLog from '../models/soslog.model.js';
import { sendEmailAlert } from '../config/mail.js';
import config from '../config/config.js';

/**
 * ✅ Create ioredis connection for BullMQ
 */
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
  logger.info('✅ [SOS QUEUE] Redis connected');
});

bullmqRedis.on('error', (err) => {
  logger.error('❌ [SOS QUEUE] Redis error:', err);
});

/**
 * ✅ BullMQ Queue for SOS alert processing
 */
export const sosQueue = new Queue('sos-alerts', {
  connection: bullmqRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * ✅ Worker that processes SOS alert jobs
 * Sends email alerts to all emergency contacts
 */
export const sosWorker = new Worker(
  'sos-alerts',
  async (job) => {
    logger.info(
      `[SOS WORKER] 🔄 Processing job: ${job.name} (ID: ${job.id})`
    );

    try {
      if (job.name === 'send-alerts') {
        // ✅ INITIAL SOS ALERT
        const { sosId, userId, location, contacts } = job.data;

        logger.info(`[SOS] Sending alerts for SOS: ${sosId}`);
        logger.info(`[SOS] Location: ${location.lat}, ${location.lng}`);
        logger.info(`[SOS] Contacts to notify: ${contacts.length}`);

        // Fetch SOS log
        const sosLog = await SOSLog.findById(sosId);
        if (!sosLog) {
          throw new Error(`SOS log ${sosId} not found`);
        }

        // Sort by priority
        const sortedContacts = contacts.sort(
          (a, b) => a.priority - b.priority
        );

        // Send email to each contact
        for (const contact of sortedContacts) {
          if (!contact.email) {
            logger.warn(
              `[SOS] ⚠️ No email for contact ${contact.name}, skipping`
            );
            continue;
          }

          try {
            logger.info(`[SOS] Sending email to ${contact.name}...`);

            const emailSuccess = await sendEmailAlert(contact.email, {
              contactName: contact.name,
              location,
              liveUrl: `${config.FRONTEND_URL}/api/v1/safety/live/${sosLog.liveShareToken}`,
              isLocationUpdate: false
            });

            if (emailSuccess) {
              sosLog.alerts.push({
                contactId: contact._id,
                channel: 'email',
                sentAt: new Date(),
                delivered: true,
                acknowledged: false
              });

              logger.info(
                `[SOS] ✅ Email sent successfully to ${contact.email}`
              );
            } else {
              logger.warn(
                `[SOS] ❌ Email failed for ${contact.email}, will retry`
              );
            }
          } catch (error: any) {
            logger.error(
              `[SOS] ❌ Error sending email to ${contact.email}: ${error.message}`
            );
          }
        }

        // Save updated SOS log
        await sosLog.save();
        logger.info(`[SOS] ✅ All alerts processed for SOS ${sosId}`);
        logger.info(`[SOS] Total alerts sent: ${sosLog.alerts.length}`);

        return {
          success: true,
          sosId,
          totalAlerts: sosLog.alerts.length
        };
      }

      // ✅ LOCATION UPDATE ALERT (NEW)
      if (job.name === 'send-location-update') {
        const { sosId, userId, location, contacts, totalUpdates } = job.data;

        logger.info(`[SOS] 📍 Sending location update for SOS: ${sosId}`);
        logger.info(`[SOS] Location: ${location.lat}, ${location.lng}`);
        logger.info(`[SOS] Contacts to notify: ${contacts.length}`);
        logger.info(`[SOS] Update number: ${totalUpdates}`);

        // Fetch SOS log
        const sosLog = await SOSLog.findById(sosId);
        if (!sosLog) {
          throw new Error(`SOS log ${sosId} not found`);
        }

        // Sort by priority
        const sortedContacts = contacts.sort(
          (a, b) => a.priority - b.priority
        );

        // Send location update email to each contact
        for (const contact of sortedContacts) {
          if (!contact.email) {
            logger.warn(
              `[SOS] ⚠️ No email for contact ${contact.name}, skipping`
            );
            continue;
          }

          try {
            logger.info(
              `[SOS] 📧 Sending location update email to ${contact.name}...`
            );

            const emailSuccess = await sendEmailAlert(contact.email, {
              contactName: contact.name,
              location,
              liveUrl: `${config.FRONTEND_URL}/api/v1/safety/live/${sosLog.liveShareToken}`,
              isLocationUpdate: true,
              updateNumber: totalUpdates
            });

            if (emailSuccess) {
              logger.info(
                `[SOS] ✅ Location update email sent to ${contact.email}`
              );
            } else {
              logger.warn(
                `[SOS] ❌ Location update email failed for ${contact.email}, will retry`
              );
            }
          } catch (error: any) {
            logger.error(
              `[SOS] ❌ Error sending location update to ${contact.email}: ${error.message}`
            );
          }
        }

        logger.info(
          `[SOS] ✅ Location update emails processed for ${contacts.length} contacts`
        );

        return {
          success: true,
          sosId,
          type: 'location-update',
          contactsNotified: contacts.length,
          updateNumber: totalUpdates
        };
      }

      throw new Error(`Unknown job type: ${job.name}`);
    } catch (error: any) {
      logger.error(
        `[SOS WORKER] ❌ Job ${job.name} failed:`,
        error.message
      );
      throw error;
    }
  },
  {
    connection: bullmqRedis,
    concurrency: 5,
    settings: {
      maxStalledCount: 2,
      stalledInterval: 5000,
      maxRetriesPerSecond: 100,
      lockDuration: 30000,
      lockRenewTime: 15000
    }
  }
);

// Event listeners
sosWorker.on('completed', (job) => {
  logger.info(`[SOS WORKER] ✅ Job ${job.id} completed successfully`);
});

sosWorker.on('failed', (job, err) => {
  logger.error(`[SOS WORKER] ❌ Job ${job?.id} failed: ${err.message}`);
});

sosWorker.on('error', (error) => {
  logger.error('[SOS WORKER] ❌ Worker error:', error);
});

export default sosQueue;
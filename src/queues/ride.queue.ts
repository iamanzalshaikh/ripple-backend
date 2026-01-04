import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import logger from '../config/logger.js';
import rideModel from '../models/ride.model.js';
import User from '../models/user.model.js';
import Badge from '../models/badge.model.js';
import Award from '../models/award.model.js';
import RideTelemetry from '../models/ridetelemetry.model.js';

// ✅ Create ioredis connection for BullMQ with correct options
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
  logger.info('✅ BullMQ Redis connected');
});

bullmqRedis.on('error', (err) => {
  logger.error('❌ BullMQ Redis error:', err);
});

/**
 * ✅ BullMQ Queue for ride processing
 */
export const rideQueue = new Queue('ride-processing', {
  connection: bullmqRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false
  }
});

/**
 * ✅ Helper function to award a badge (reusable)
 */
const awardBadge = async (
  userId: string,
  badgeCode: string,
  badgesAwarded: string[]
): Promise<void> => {
  try {
    const badge = await Badge.findOne({ code: badgeCode });
    if (!badge) {
      logger.warn(`Badge not found: ${badgeCode}`);
      return;
    }

    const existingAward = await Award.findOne({
      userId,
      badgeId: badge._id
    });
    if (existingAward) {
      logger.info(`Badge already awarded: ${badgeCode} to user ${userId}`);
      return;
    }

    // Create award record
    await Award.create({
      userId,
      badgeId: badge._id,
      awardedAt: new Date()
    });

    // Update user - separate operations for reliability
    // Step 1: Add badge to array
    await User.updateOne(
      { _id: userId },
      { $addToSet: { badges: badge._id } }
    );

    // Step 2: Increment counter
    await User.updateOne(
      { _id: userId },
      { $inc: { totalBadges: 1 } }
    );

    badgesAwarded.push(badgeCode);
    logger.info(`🏆 ${badgeCode} badge awarded to ${userId}`);
  } catch (error: any) {
    logger.error(`Error awarding ${badgeCode} badge:`, error.message);
  }
};

/**
 * ✅ Worker that processes ride background jobs
 */
export const rideWorker = new Worker(
  'ride-processing',
  async (job) => {
    logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

    try {
      // ==================== JOB: analyze-ride ====================
      if (job.name === 'analyze-ride') {
        const { rideId, userId } = job.data;
        const ride = await rideModel.findById(rideId);

        if (!ride) {
          throw new Error(`Ride ${rideId} not found`);
        }

        const speedScore = Math.min(50, ride.avgSpeed * 2);
        const distanceScore = Math.min(50, (ride.distance / 10000) * 50);
        const aiScore = Math.round(speedScore + distanceScore);

        ride.aiScore = aiScore;
        ride.aiFeedback = [
          `Average speed: ${ride.avgSpeed.toFixed(1)} km/h`,
          `Max speed: ${ride.maxSpeed.toFixed(1)} km/h`,
          `Duration: ${Math.round(ride.duration / 60)} minutes`,
          aiScore >= 80 ? '🔥 Excellent ride!' : aiScore >= 60 ? '✅ Good ride!' : '⚠️ Work on smoothness'
        ];
        await ride.save();

        logger.info(`✅ Analyzed ride ${rideId}: score ${aiScore}`);
        return { analyzed: true, score: aiScore };
      }

      // ==================== JOB: award-badges (FIXED!) ====================
      if (job.name === 'award-badges') {
        const { rideId, userId, distanceMeters, duration } = job.data;

        const distanceKm = distanceMeters / 1000;
        const durationMinutes = duration / 60;

        const user = await User.findById(userId);
        if (!user) throw new Error(`User ${userId} not found`);

        // ✅ totalDistance is ALREADY in KM, don't divide by 1000!
        const totalDistanceKm = user.totalDistance || 0;
        const badgesAwarded: string[] = [];

        // 🔍 DEBUG LOGGING
        logger.info(`[award-badges DEBUG] User ${userId}:`);
        logger.info(`  - totalDistance: ${user.totalDistance}`);
        logger.info(`  - totalRides: ${user.totalRides}`);
        logger.info(`  - distanceKm (this ride): ${distanceKm}`);
        logger.info(`  - newTotalDistance: ${totalDistanceKm + distanceKm}`);

        // First Ride Badge
        if (user.totalRides === 1) {
          await awardBadge(userId, 'first_ride', badgesAwarded);
        }

        const newTotalDistanceKm = totalDistanceKm + distanceKm;

        // Century Rider (100km)
        if (newTotalDistanceKm >= 100 && totalDistanceKm < 100) {
          await awardBadge(userId, 'century_rider', badgesAwarded);
        }

        // 500 KM Club
        if (newTotalDistanceKm >= 500 && totalDistanceKm < 500) {
          await awardBadge(userId, '500km_club', badgesAwarded);
        }

        // 1000 KM Club
        if (newTotalDistanceKm >= 1000 && totalDistanceKm < 1000) {
          await awardBadge(userId, 'thousand_km_club', badgesAwarded);
        }

        // Speedster (max speed >= 100 km/h)
        const ride = await rideModel.findById(rideId);
        if (ride && ride.maxSpeed >= 100) {
          await awardBadge(userId, 'speedster', badgesAwarded);
        }

        // Long Rider (60+ minutes)
        if (durationMinutes >= 60) {
          await awardBadge(userId, 'long_rider', badgesAwarded);
        }

        // Night Owl (ride between 8 PM and 6 AM)
        if (ride) {
          const startHour = ride.startedAt.getHours();

          if (startHour >= 20 || startHour < 6) {
            await awardBadge(userId, 'night_owl', badgesAwarded);
          }

          // Early Bird (ride between 5 AM and 7 AM)
          if (startHour >= 5 && startHour < 7) {
            await awardBadge(userId, 'early_bird', badgesAwarded);
          }
        }

        logger.info(`✅ Badge check complete for ${userId}: ${badgesAwarded.length} awarded`);
        return { badgesAwarded, count: badgesAwarded.length };
      }

      // ==================== JOB: cleanup-telemetry ====================
      if (job.name === 'cleanup-telemetry') {
        const { rideId } = job.data;

        const result = await RideTelemetry.deleteMany({ rideId });
        logger.info(`🗑️ Cleaned up ${result.deletedCount} telemetry docs for ride ${rideId}`);

        return { cleaned: result.deletedCount };
      }

      throw new Error(`Unknown job type: ${job.name}`);
    } catch (error: any) {
      logger.error(`❌ Job ${job.name} failed:`, error.message);
      throw error;
    }
  },
  // {
  //   connection: bullmqRedis,
  //   concurrency: 10,
  //   settings: {
  //     maxStalledCount: 2 as any,
  //     stalledInterval: 5000,
  //     maxRetriesPerSecond: 100,
  //     lockDuration: 30000,
  //     lockRenewTime: 15000
  //   }
  // }

  {
    connection: bullmqRedis,
    concurrency: 10,
    settings: {
      maxStalledCount: 2 as any,
      stalledInterval: 5000,
      maxRetriesPerSecond: 100,
      lockDuration: 30000,
      lockRenewTime: 15000
    } as any  // ✅ ADD THIS
  }
);

// ==================== Event Listeners ====================

rideWorker.on('completed', (job) => {
  logger.info(`✅ Job ${job.id} (${job.name}) completed`);
});

rideWorker.on('failed', (job, err) => {
  logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

rideWorker.on('error', (error) => {
  logger.error('❌ Worker error:', error);
});

export default rideQueue;
import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { Server as SocketIOServer } from "socket.io";
import logger from "../config/logger.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import app from "../app.js";
import { sendNotification } from "../services/notification.service.js";

const bullmqRedis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

bullmqRedis.on("connect", () => {
  logger.info("✅ Post Queue Redis connected");
});

bullmqRedis.on("error", (err) => {
  logger.error("❌ Post Queue Redis error:", err);
});

export const postQueue = new Queue("post-processing", {
  connection: bullmqRedis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export const postWorker = new Worker(
  "post-processing",
  async (job) => {
    logger.info(`[WORKER] Processing job: ${job.name} (ID: ${job.id})`);

    try {
      const io = (app as any).io as SocketIOServer | null;

      if (job.name === "send-notification") {
        const {
          type,
          userId,
          fromUserId,
          fromUserName,
          fromUserAvatar,
          postId,
          commentId,
          commentText,
          message,
        } = job.data;

        logger.info(
          `[send-notification] Creating notification for user ${userId}`,
        );

        if (userId === fromUserId) {
          logger.info(`[send-notification] Skipping self-notification`);
          return { skipped: true };
        }

        // Use unified notification service for DB + Socket.io + Push notifications
        await sendNotification({
          userId,
          type: type as any,
          fromUserId,
          fromUserName,
          message: message || "New activity",
          data: {
            postId,
            commentId,
            commentText,
            fromUserAvatar,
          },
          io,
          priority: type === "sos" ? "high" : "default",
        });

        logger.info(
          `[send-notification] Unified notification sent to user ${userId} (DB + Socket + Push)`,
        );

        return { notified: true, unified: true };
      }

      if (job.name === "notify-followers") {
        const { postId, userId, userName, userAvatar } = job.data;

        logger.info(
          `[notify-followers] User ${userId} shared a post, notifying followers`,
        );

        const user = await User.findById(userId).select("followers");
        if (!user || !user.followers || user.followers.length === 0) {
          logger.info(`[notify-followers] User ${userId} has no followers`);
          return { notified: 0 };
        }

        const followerIds = user.followers.map((id) => id.toString());
        logger.info(`[notify-followers] Found ${followerIds.length} followers`);

        const notifications = followerIds.map((followerId) => ({
          userId: followerId,
          type: "ride_share",
          fromUserId: userId,
          postId,
          message: `${userName} shared a new post`,
          read: false,
        }));

        await Notification.insertMany(notifications);
        logger.info(
          `[notify-followers] Created ${notifications.length} notifications in DB`,
        );

        if (io) {
          followerIds.forEach((followerId) => {
            io.to(`user:${followerId}`).emit("notification", {
              type: "ride_share",
              fromUserId: userId,
              fromUserName: userName,
              fromUserAvatar: userAvatar,
              postId,
              message: `${userName} shared a new post`,
              timestamp: new Date(),
              read: false,
            });
          });

          logger.info(
            `[notify-followers] Real-time notifications sent to ${followerIds.length} followers`,
          );
        } else {
          logger.warn(
            `[notify-followers] Socket.io not available, only saved to DB`,
          );
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
      lockRenewTime: 15000,
    } as any,
  },
);

postWorker.on("completed", (job) => {
  logger.info(`✅ Job ${job.id} (${job.name}) completed`);
});

postWorker.on("failed", (job, err) => {
  logger.error(`❌ Job ${job?.id} (${job?.name}) failed: ${err.message}`);
});

postWorker.on("error", (error) => {
  logger.error("❌ Worker error:", error);
});

export default postQueue;

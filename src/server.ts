import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import config from "./config/config.js";
import { connectRedis } from "./config/redis.js";
import { initBadges } from "./seeds/initBadges.js";
import seedSubscriptionPlans from "./seeds/subscriptionPlans.seed.js";
import initializeSocket from "./config/socket.js";
import logger from "./config/logger.js";
import { startSubscriptionJobs } from "./jobs/subscription.cron.js";

const startServer = async () => {
  try {
    // ==================== INITIALIZE SERVICES ====================

    // Connect to MongoDB
    await connectDB();
    logger.info("✅ MongoDB connected");

    // Connect to Redis
    await connectRedis();
    logger.info("✅ Redis connected");

    // Initialize badges
    await initBadges();

    // Initialize subscription plans
    await seedSubscriptionPlans();
    logger.info("✅ Badges initialized");

    // Start subscription cron jobs
    startSubscriptionJobs();
    logger.info("✅ Subscription cron jobs started");

    // ==================== CREATE HTTP SERVER ====================
    // Required for Socket.io
    const httpServer = createServer(app);
    logger.info("✅ HTTP server created");

    // ==================== INITIALIZE SOCKET.IO ====================
    // This handles:
    // - Ride Events (chat, GPS, SOS)
    // - Groups (chat, typing)
    // - Private Chat (1:1 messaging)
    // - Notifications
    const io: SocketIOServer = initializeSocket(httpServer);
    logger.info("✅ Socket.io initialized");

    // ==================== ATTACH IO TO APP ====================
    // Controllers can access: (app as any).io
    // Useful for sending notifications from API endpoints
    (app as any).io = io;
    logger.info("✅ Socket.io attached to app");

    // ==================== START SERVER ====================
    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${config.PORT}`);
      logger.info(`✅ WebSocket server ready at ws://localhost:${config.PORT}`);
      logger.info("");
      logger.info("Available Socket.io channels:");
      logger.info("  - Ride Events: ride:{rideEventId}");
      logger.info("  - Groups: group:{groupId}");
      logger.info("  - Private Chat: private:{roomId}");
      logger.info("  - Notifications: user:{userId}");
      logger.info("");
    });

    // ==================== GRACEFUL SHUTDOWN ====================

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully...");
      httpServer.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      logger.error(`❌ Uncaught Exception: ${error.message}`);
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      logger.error(`❌ Unhandled Rejection at ${promise}: ${reason}`);
    });
  } catch (error: any) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

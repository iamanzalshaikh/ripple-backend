// import { createServer } from "http";
// import app from "./app.js";
// import connectDB from "./config/db.js";
// import config from "./config/config.js";
// import { connectRedis } from "./config/redis.js";
// import { initBadges } from "./seeds/initBadges.js";

// const startServer = async () => {
//   await connectDB();

//   await connectRedis();

//   await initBadges();

//   const httpServer = createServer(app);

//   httpServer.listen(config.PORT, () => {
//     console.log(`🚀 Server running on http://localhost:${config.PORT}`);
//   });
// };

// startServer();

// ==========================================
// File: src/server.ts (UPDATED WITH SOCKET.IO)
// ==========================================
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import connectDB from "./config/db.js";
import config from "./config/config.js";
import { connectRedis } from "./config/redis.js";
import { initBadges } from "./seeds/initBadges.js";
import initializeSocket from "./config/socket.js";
import logger from "./config/logger.js";

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info("✅ MongoDB connected");

    // Connect to Redis
    await connectRedis();
    logger.info("✅ Redis connected");

    // Initialize badges
    await initBadges();
    logger.info("✅ Badges initialized");

    // ✅ CREATE HTTP SERVER (required for Socket.io)
    const httpServer = createServer(app);

    // ✅ INITIALIZE SOCKET.IO
    const io: SocketIOServer = initializeSocket(httpServer);
    logger.info("✅ Socket.io initialized");

    // ✅ ATTACH IO TO APP (so controllers can access it)
    (app as any).io = io;

    // Start listening
    httpServer.listen(config.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${config.PORT}`);
      logger.info(`✅ WebSocket server ready at ws://localhost:${config.PORT}`);
    });

    // ✅ GRACEFUL SHUTDOWN
    process.on("SIGTERM", () => {
      logger.info("SIGTERM received, shutting down gracefully...");
      httpServer.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received, shutting down gracefully...");
      httpServer.close(() => {
        logger.info("Server closed");
        process.exit(0);
      });
    });
  } catch (error: any) {
    logger.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

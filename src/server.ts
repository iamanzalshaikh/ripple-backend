import "dotenv/config";
import { createServer } from "http";
import app from "./app.js";
import connectDB from "./config/db.js";
import config from "./config/config.js";
import logger from "./config/logger.js";
import { connectRedis } from "./config/redis.js";
import { initializeSocket } from "./config/socket.js";

const start = async () => {
  await connectDB();
  await connectRedis();

  const httpServer = createServer(app);
  initializeSocket(httpServer);

  httpServer.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      logger.error(
        `Port ${config.PORT} is already in use — another ripple-backend is running. ` +
          `On Windows: netstat -ano | findstr :${config.PORT} then taskkill /PID <pid> /F`,
      );
      process.exit(1);
    }
    throw err;
  });

  httpServer.listen(config.PORT, () => {
    logger.info(`ripple-backend http://localhost:${config.PORT}`);
    logger.info(`swagger http://localhost:${config.PORT}/api-docs`);
    if (!config.OPENAI_API_KEY) {
      logger.warn(
        "OPENAI_API_KEY is not set — desktop LLM planner and Whisper will not work",
      );
    }
  });

  const shutdown = () => {
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((e) => {
  logger.error("Failed to start", e);
  process.exit(1);
});

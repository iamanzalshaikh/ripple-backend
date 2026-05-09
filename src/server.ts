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

  const server = httpServer.listen(config.PORT, () => {
    logger.info(`ripple-backend http://localhost:${config.PORT}`);
    logger.info(`swagger http://localhost:${config.PORT}/api-docs`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
};

start().catch((e) => {
  logger.error("Failed to start", e);
  process.exit(1);
});

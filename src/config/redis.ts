import { createClient } from "redis";
import config from "./config.js";
import logger from "./logger.js";

const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on("connect", () => {
  logger.info("Redis client connected");
});

redisClient.on("error", (err) => {
  logger.error("Redis client error", err);
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!config.REDIS_URL) return;
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    logger.error("Failed to connect to Redis", error);
  }
};

export default redisClient;


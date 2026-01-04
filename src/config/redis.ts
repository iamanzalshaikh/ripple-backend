import { createClient } from "redis";
import config from "./config.js";

const redisClient = createClient({
  url: config.REDIS_URL,
});

// Redis event listeners
redisClient.on("connect", () => {
  console.log("✅ Redis client connected");
});

redisClient.on("error", (err) => {
  console.error("❌ Redis client error", err);
});

// Explicit connect function (called from server.ts)
export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error("❌ Failed to connect to Redis", error);
  }
};

export default redisClient;

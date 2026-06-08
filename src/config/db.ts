import { PrismaClient } from "@prisma/client";
import config from "./config.js";
import logger from "./logger.js";

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.DATABASE_URL,
    },
  },
});

export function isDbUnavailable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /Can't reach database server|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|Connection terminated unexpectedly/i.test(
    msg,
  );
}

const connectDB = async (): Promise<{ connected: boolean }> => {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected (Prisma)");
    return { connected: true };
  } catch (error) {
    // Run in "offline" mode (no persistence) when DB is down.
    logger.error("PostgreSQL connection failed (continuing without DB)", error);
    return { connected: false };
  }
};

export default connectDB;

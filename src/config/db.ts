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

const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("PostgreSQL connected (Prisma)");
  } catch (error) {
    logger.error("PostgreSQL connection failed", error);
    process.exit(1);
  }
};

export default connectDB;

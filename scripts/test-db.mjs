import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  await prisma.$queryRaw`SELECT 1`;
  console.log("DB OK");
} catch (e) {
  console.error("DB FAIL:", e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}

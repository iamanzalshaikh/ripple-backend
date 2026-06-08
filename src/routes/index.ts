import express, { type Router } from "express";
import { prisma } from "../config/db.js";
import authRoutes from "./auth.routes.js";
import publicRoutes from "./public.routes.js";
import userRoutes from "./user.routes.js";
import voiceRoutes from "./voice.routes.js";
import transcriptRoutes from "./transcript.routes.js";
import sessionRoutes from "./session.routes.js";
import commandRoutes from "./command.routes.js";

const router: Router = express.Router();

router.get("/health", async (_req, res) => {
  let db = false;
  let dbError: string | undefined;
  try {
    await prisma.$queryRaw`SELECT 1`;
    db = true;
  } catch (e: unknown) {
    dbError = e instanceof Error ? e.message : "Database unreachable";
  }

  const ok = db;
  res.status(ok ? 200 : 503).json({
    ok,
    db,
    service: "ripple-backend",
    timestamp: new Date().toISOString(),
    ...(dbError ? { db_error: dbError } : {}),
  });
});

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/voice", voiceRoutes);
router.use("/transcripts", transcriptRoutes);
router.use("/session", sessionRoutes);
router.use("/commands", commandRoutes);

export default router;

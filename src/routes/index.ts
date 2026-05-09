import express, { type Router } from "express";
import authRoutes from "./auth.routes.js";
import adminAuthRoutes from "./admin.auth.routes.js";
import publicRoutes from "./public.routes.js";
import userRoutes from "./user.routes.js";
import voiceRoutes from "./voice.routes.js";
import transcriptRoutes from "./transcript.routes.js";
import sessionRoutes from "./session.routes.js";
import commandRoutes from "./command.routes.js";

const router: Router = express.Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "ripple-backend",
    timestamp: new Date().toISOString(),
  });
});

router.use("/public", publicRoutes);
router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/voice", voiceRoutes);
router.use("/transcripts", transcriptRoutes);
router.use("/session", sessionRoutes);
router.use("/commands", commandRoutes);
router.use("/admin/auth", adminAuthRoutes);

export default router;

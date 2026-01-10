import express from "express";
import authRoutes from "./auth.routes.js";
import profileRoutes from "./profile.routes.js";
import bikeRoutes from "./bike.routes.js";
import onboardingRoutes from "./onboarding.routes.js";
import rideRoutes from "./ride.routes.js";
import badgeawardRoutes from "./badgeaward.routes.js";
import soslogRoutes from "./soslog.routes.js";
import publicRoutes from "./public.routes.js";
import postRoutes from "./post.routes.js";
import notificationRoutes from "./notification.routes.js";
import rideEventRoutes from "./rideEvent.routes.js";
import groupRoutes from "./group.routes.js";
import chatRoutes from "./chat.routes.js";
import followRoutes from "./follow.routes.js";

const router: express.Router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Health Check
 *     description: Check if the server is running
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server is up and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: HerRidez API v1
 */
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date(),
    service: "HerRidez API v1",
  });
});
router.use("/public", publicRoutes);
// Auth Routes
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/bikes", bikeRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/badges", badgeawardRoutes);

router.use("/rides", rideRoutes);
router.use("/safety", soslogRoutes);

router.use("/posts", postRoutes);
router.use("/notifications", notificationRoutes);

router.use("/rideevents", rideEventRoutes);
router.use("/groups", groupRoutes);
router.use("/chat", chatRoutes);
router.use("/users", followRoutes);

export default router;

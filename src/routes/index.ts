import express from "express";
import authRoutes from "./auth.routes.ts";
import profileRoutes from "./profile.routes.ts";
import bikeRoutes from "./bike.routes.ts"
import onboardingRoutes from "./onboarding.routes.ts";
import rideRoutes from "./ride.routes.ts";
import badgeawardRoutes from "./badgeaward.routes";
import soslogRoutes from "./soslog.routes.ts";
import publicRoutes from "./public.routes.ts";
import postRoutes from "./post.routes.ts";
import notificationRoutes from "./notification.routes.ts";
const router = express.Router();

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
router.use('/public', publicRoutes); 
// Auth Routes
router.use("/auth", authRoutes)
router.use("/profile", profileRoutes);
router.use("/bikes", bikeRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/badges", badgeawardRoutes);



router.use('/rides', rideRoutes);
router.use('/safety', soslogRoutes); 


router.use('/posts', postRoutes);
router.use('/notifications', notificationRoutes);

export default router;
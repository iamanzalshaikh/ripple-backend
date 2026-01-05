import express from "express";
import authRoutes from "./auth.routes";
import profileRoutes from "./profile.routes";
import bikeRoutes from "./bike.routes";
import onboardingRoutes from "./onboarding.routes";
import rideRoutes from "./ride.routes";
import badgeawardRoutes from "./badgeaward.routes";
import soslogRoutes from "./soslog.routes";
import publicRoutes from "./public.routes";
import postRoutes from "./post.routes";
import notificationRoutes from "./notification.routes";
import rideEventRoutes from "./rideEvent.routes";
import groupRoutes from "./group.routes";
import chatRoutes from "./chat.routes";


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

router.use('/rideevents', rideEventRoutes);
router.use('/groups', groupRoutes);
router.use('/chat', chatRoutes);

export default router;

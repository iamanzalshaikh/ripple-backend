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
import marketplaceRoutes from "./marketplace.routes.js";
import adminAuthRoutes from "./admin.auth.routes.js";
import adminDashboardRoutes from "./admin.dashboard.routes.js";
import adminUserRoutes from "./admin.users.routes.js";
import adminRideEventRoutes from "./admin.rideEvents.routes.js";
import adminPaymentRoutes from "./admin.payments.routes.js";
import adminSOSRoutes from "./admin.sos.routes.js";
import adminCreatorsRoutes from "./admin.creators.routes.js";
import adminPressRoutes from "./admin.press.routes.js";
import adminBrandsRoutes from "./admin.brands.routes.js";
import adminSponsorshipRoutes from "./admin.sponsorship.routes.js";
import creatorRoutes from "./creator.routes.js";
import sponsorshipRoutes from "./sponsorship.routes.js";
import mediaFeedRoutes from "./media-feed.routes.js";
import brandsRoutes from "./brands.routes.js";
import pressRoutes from "./press.routes.js";

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
router.use("/marketplace", marketplaceRoutes);

// Creator & Sponsorship Routes
router.use("/creator", creatorRoutes);
router.use("/sponsorship", sponsorshipRoutes);
router.use("/media-feed", mediaFeedRoutes);
router.use("/brands", brandsRoutes);
router.use("/press", pressRoutes);

// Admin Routes
router.use("/admin/auth", adminAuthRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/admin/users", adminUserRoutes);
router.use("/admin/ride-events", adminRideEventRoutes);
router.use("/admin/payments", adminPaymentRoutes);
router.use("/admin/sos", adminSOSRoutes);
router.use("/admin/creators", adminCreatorsRoutes);
router.use("/admin/press", adminPressRoutes);
router.use("/admin/brands", adminBrandsRoutes);
router.use("/admin/sponsorship", adminSponsorshipRoutes);

export default router;

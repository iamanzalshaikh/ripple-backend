import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getPaidRideEvents,
  getRideEventPaymentDetails,
  getRevenueAnalytics,
} from "../controllers/admin.payments.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * Payment & Revenue Routes
 */
router.get("/events", getPaidRideEvents);
router.get("/events/:eventId", getRideEventPaymentDetails);
router.get("/revenue", getRevenueAnalytics);

export default router;

import express, { Router } from "express";
import {
  getPlans,
  getSubscriptionStatus,
  upgradeSubscription,
} from "../controllers/subscription.controller.js";
import isAuth from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

/**
 * GET /api/v1/subscriptions/plans
 * Get all available subscription plans
 * Public route (no auth required)
 */
router.get("/plans", getPlans);

/**
 * GET /api/v1/subscriptions/status
 * Get current user's subscription status
 * Requires: auth
 */
router.get("/status", isAuth, getSubscriptionStatus);

/**
 * POST /api/v1/subscriptions/upgrade
 * Upgrade user subscription (demo payment)
 * Requires: auth
 */
router.post("/upgrade", isAuth, upgradeSubscription);

export default router;


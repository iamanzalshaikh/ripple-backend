import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getUserOverview,
  getVerificationStats,
  getRidingStats,
  getRidingLevels,
  getGeography,
  getBikeStats,
  getAccountStatus,
  getMarketplaceStats,
} from "../controllers/admin.dashboard.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * User Metrics
 */
router.get("/users/overview", getUserOverview);
router.get("/users/riding-levels", getRidingLevels);
router.get("/users/geography", getGeography);

/**
 * Verification Metrics
 */
router.get("/verification/stats", getVerificationStats);

/**
 * Riding Metrics
 */
router.get("/riding/stats", getRidingStats);

/**
 * Bike Metrics
 */
router.get("/bikes/stats", getBikeStats);

/**
 * Account Status Metrics
 */
router.get("/accounts/status", getAccountStatus);

/**
 * Marketplace Metrics
 */
router.get("/marketplace/stats", getMarketplaceStats);

export default router;

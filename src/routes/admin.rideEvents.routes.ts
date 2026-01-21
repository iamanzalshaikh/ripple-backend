import express, { Router } from "express";
import {
  getAllRideEvents,
  getRideEventById,
  approveRideEvent,
  rejectRideEvent,
  cancelRideEvent,
  getRideEventsStats,
} from "../controllers/admin.rideEvents.controller.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router: Router = express.Router();

/**
 * All routes require admin authentication
 */
router.use(adminAuth);

/**
 * @route   GET /api/v1/admin/ride-events/stats
 * @desc    Get ride events statistics
 * @access  Admin
 */
router.get("/stats", getRideEventsStats);

/**
 * @route   GET /api/v1/admin/ride-events
 * @desc    List all ride events with filters
 * @access  Admin
 */
router.get("/", getAllRideEvents);

/**
 * @route   GET /api/v1/admin/ride-events/:id
 * @desc    Get ride event details
 * @access  Admin
 */
router.get("/:id", getRideEventById);

/**
 * @route   PATCH /api/v1/admin/ride-events/:id/approve
 * @desc    Approve a paid ride event
 * @access  Admin
 */
router.patch("/:id/approve", approveRideEvent);

/**
 * @route   PATCH /api/v1/admin/ride-events/:id/reject
 * @desc    Reject a paid ride event
 * @access  Admin
 */
router.patch("/:id/reject", rejectRideEvent);

/**
 * @route   PATCH /api/v1/admin/ride-events/:id/cancel
 * @desc    Cancel a ride event
 * @access  Admin
 */
router.patch("/:id/cancel", cancelRideEvent);

export default router;

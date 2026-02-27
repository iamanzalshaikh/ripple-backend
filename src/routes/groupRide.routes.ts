import express, { Router } from "express";
import {
  createGroupRide,
  joinGroupRide,
  startGroupRide,
  leaveGroupRide,
  endGroupRide,
  streamGroupLocation,
  getGroupLocations,
  getGroupRide,
} from "../controllers/groupRide.controller.js";
import isAuth from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

// ✅ Type workarounds (same pattern as ride.routes.ts)
const wrappedCreateGroupRide: any = createGroupRide;
const wrappedJoinGroupRide: any = joinGroupRide;
const wrappedStartGroupRide: any = startGroupRide;
const wrappedLeaveGroupRide: any = leaveGroupRide;
const wrappedEndGroupRide: any = endGroupRide;
const wrappedStreamGroupLocation: any = streamGroupLocation;
const wrappedGetGroupLocations: any = getGroupLocations;
const wrappedGetGroupRide: any = getGroupRide;

/**
 * POST /api/v1/group-ride/create
 * Create a new group ride — returns rideId + joinCode
 */
router.post("/create", isAuth, wrappedCreateGroupRide);

/**
 * POST /api/v1/group-ride/join
 * Join a group ride via joinCode
 * Body: { joinCode: string }
 */
router.post("/join", isAuth, wrappedJoinGroupRide);

/**
 * POST /api/v1/group-ride/start
 * Start a waiting group ride (creator only)
 * Body: { rideId: string }
 */
router.post("/start", isAuth, wrappedStartGroupRide);

/**
 * POST /api/v1/group-ride/leave
 * Leave a group ride
 * Body: { rideId: string }
 * If creator leaves → auto-ends ride
 */
router.post("/leave", isAuth, wrappedLeaveGroupRide);

/**
 * POST /api/v1/group-ride/end
 * End a group ride (creator only) — deletes Redis location hash
 * Body: { rideId: string }
 */
router.post("/end", isAuth, wrappedEndGroupRide);

/**
 * PATCH /api/v1/group-ride/:rideId/stream
 * Stream live location during an active group ride
 * Body: { lat, lng, speed?, accuracy? }
 * Requires: ride.status === "active" AND user is participant
 */
router.patch("/:rideId/stream", isAuth, wrappedStreamGroupLocation);

/**
 * GET /api/v1/group-ride/:rideId/locations
 * Get all current live locations for a group ride (participants only)
 */
router.get("/:rideId/locations", isAuth, wrappedGetGroupLocations);

/**
 * GET /api/v1/group-ride/:rideId
 * Get group ride details (participants only)
 * NOTE: Must be after /:rideId/locations to avoid route conflict
 */
router.get("/:rideId", isAuth, wrappedGetGroupRide);

export default router;

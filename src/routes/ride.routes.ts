// // ==================== routes/ride.routes.ts ====================

// import express, { Router } from 'express';
// import { deleteRide, endRide, getLiveRide, getMyRides, getRideById, pauseRide, resumeRide, startRide, streamChunk } from '../controllers/ride.controller';
// import isAuth from '../middlewares/auth.middleware';

// const router: Router = express.Router();

// /**
//  * ==================== RIDE MANAGEMENT ====================
//  */

// /**
//  * POST /api/v1/rides/start
//  * Start a new ride
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Body:
//  * {
//  *   "bikeId": "bike_id_here",
//  *   "liveShare": true
//  * }
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "rideId": "...",
//  *     "liveToken": "abc123xyz",
//  *     "startedAt": "2024-01-01T12:00:00Z"
//  *   }
//  * }
//  */
// router.post('/start', isAuth, startRide);

// /**
//  * PATCH /api/v1/rides/:id/stream
//  * Stream GPS location chunks during ride
//  * (Call every 10-30 seconds with new GPS points)
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Body:
//  * {
//  *   "chunk": [
//  *     {
//  *       "timestamp": 1704067200000,
//  *       "lat": 19.0760,
//  *       "lng": 72.8777,
//  *       "speed": 15.5,
//  *       "accuracy": 5,
//  *       "bearing": 45,
//  *       "accel": { "x": 0.1, "y": 0.2, "z": 9.8 }
//  *     },
//  *     { ... more points ... }
//  *   ]
//  * }
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "pointsReceived": 10,
//  *     "totalPoints": 245,
//  *     "live": true
//  *   }
//  * }
//  */
// router.patch('/:id/stream', isAuth, streamChunk);

// /**
//  * PATCH /api/v1/rides/:id/pause
//  * Pause active ride
//  * GPS streaming will be rejected while paused
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": { "status": "paused" }
//  * }
//  */
// router.patch('/:id/pause', isAuth, pauseRide);

// /**
//  * PATCH /api/v1/rides/:id/resume
//  * Resume paused ride
//  * GPS streaming will be accepted again
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": { "status": "active" }
//  * }
//  */
// router.patch('/:id/resume', isAuth, resumeRide);

// /**
//  * PATCH /api/v1/rides/:id/end
//  * End ride, calculate stats, trigger background jobs
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Body:
//  * {
//  *   "privacy": "friends"  // or "private" | "public"
//  * }
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "rideId": "...",
//  *     "distance": "12.45",
//  *     "distanceMeters": 12450,
//  *     "duration": 3600,
//  *     "avgSpeed": "12.45",
//  *     "maxSpeed": "45.67",
//  *     "pointsRecorded": 243
//  *   }
//  * }
//  */
// router.patch('/:id/end', isAuth, endRide);

// /**
//  * ==================== RIDE QUERIES ====================
//  */

// /**
//  * GET /api/v1/rides/me
//  * Get all user rides with pagination
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  * Query Parameters:
//  * - page: number (default: 1)
//  * - limit: number (default: 10, max: 50)
//  *
//  * Example: GET /api/v1/rides/me?page=1&limit=20
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": [
//  *     {
//  *       "_id": "...",
//  *       "distance": 12450,
//  *       "duration": 3600,
//  *       "avgSpeed": 12.45,
//  *       "maxSpeed": 45.67,
//  *       "status": "completed",
//  *       "startedAt": "2024-01-01T12:00:00Z",
//  *       "endedAt": "2024-01-01T13:00:00Z",
//  *       "bikeId": { "brand": "Yamaha", "model": "R3" }
//  *     }
//  *   ],
//  *   "pagination": {
//  *     "page": 1,
//  *     "limit": 20,
//  *     "total": 45,
//  *     "pages": 3
//  *   }
//  * }
//  */
// router.get('/me', isAuth, getMyRides);

// /**
//  * ==================== RIDE DETAILS ====================
//  */

// /**
//  * GET /api/v1/rides/:id
//  * Get single ride details (privacy-aware)
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "_id": "...",
//  *     "userId": { "name": "...", "avatar": "..." },
//  *     "bikeId": { "brand": "Yamaha", "model": "R3" },
//  *     "distance": 12450,
//  *     "duration": 3600,
//  *     "avgSpeed": 12.45,
//  *     "maxSpeed": 45.67,
//  *     "simplifiedPolyline": [
//  *       { "lat": 19.0760, "lng": 72.8777 },
//  *       { "lat": 19.0761, "lng": 72.8778 }
//  *     ],
//  *     "status": "completed",
//  *     "privacy": "friends",
//  *     "aiScore": 82,
//  *     "aiFeedback": [
//  *       "Good acceleration control",
//  *       "Average speed: 12.45 km/h"
//  *     ]
//  *   }
//  * }
//  */
// router.get('/:id', isAuth, getRideById);

// /**
//  * ==================== LIVE TRACKING (NO AUTH) ====================
//  */

// /**
//  * GET /api/v1/rides/live/:token
//  * Public live ride tracking (NO AUTHENTICATION REQUIRED)
//  * Token expires 24 hours after ride ends
//  *
//  * Example: GET /api/v1/rides/live/abc123xyz789
//  *
//  * Response (while ride active):
//  * {
//  *   "success": true,
//  *   "data": {
//  *     "rideId": "...",
//  *     "riderName": "Priya Sharma",
//  *     "riderAvatar": "https://...",
//  *     "bike": "Yamaha R3",
//  *     "currentLocation": { "lat": 19.0760, "lng": 72.8777, "speed": "45.67" },
//  *     "distance": "12.45",
//  *     "duration": 3600,
//  *     "avgSpeed": 12.45,
//  *     "updatedAt": "2024-01-01T13:00:00Z"
//  *   }
//  * }
//  *
//  * Response (if ride ended):
//  * {
//  *   "success": false,
//  *   "error": "Live ride not found"
//  * }
//  */
// // ⚠️ IMPORTANT: This route MUST be last to avoid conflicts with :id
// router.get('/live/:token', getLiveRide);

// /**
//  * ==================== RIDE DELETION ====================
//  */

// /**
//  * DELETE /api/v1/rides/:id
//  * Delete a ride (completed rides only)
//  *
//  * Headers: Authorization: Bearer YOUR_TOKEN
//  *
//  * Response:
//  * {
//  *   "success": true,
//  *   "data": { "message": "Ride deleted" }
//  * }
//  */
// router.delete('/:id', isAuth, deleteRide);

// export default router;

import express, { Router } from "express";
import {
  deleteRide,
  endRide,
  getActiveRide,
  getLiveRide,
  getMyRides,
  getRideById,
  pauseRide,
  resumeRide,
  startRide,
  streamChunk,
  cancelRide,
} from "../controllers/ride.controller.js";
import isAuth from "../middlewares/auth.middleware.js";

const router: Router = express.Router();

const wrappedStartRide: any = startRide;
const wrappedStreamChunk: any = streamChunk;
const wrappedPauseRide: any = pauseRide;
const wrappedResumeRide: any = resumeRide;
const wrappedEndRide: any = endRide;
const wrappedGetActiveRide: any = getActiveRide;
const wrappedGetMyRides: any = getMyRides;
const wrappedGetRideById: any = getRideById;
const wrappedDeleteRide: any = deleteRide;
const wrappedCancelRide: any = cancelRide;

router.post("/start", isAuth, wrappedStartRide);
router.patch("/:id/stream", isAuth, wrappedStreamChunk);
router.patch("/:id/pause", isAuth, wrappedPauseRide);
router.patch("/:id/resume", isAuth, wrappedResumeRide);
router.patch("/:id/end", isAuth, wrappedEndRide);
router.delete("/:id/cancel", isAuth, wrappedCancelRide); // Cancel ride (no GPS data)
router.get("/active", isAuth, wrappedGetActiveRide); // Must be before /:id route
router.get("/me", isAuth, wrappedGetMyRides);
router.get("/:id", isAuth, wrappedGetRideById);
router.get("/live/:token", getLiveRide);
router.delete("/:id", isAuth, wrappedDeleteRide);

export default router;

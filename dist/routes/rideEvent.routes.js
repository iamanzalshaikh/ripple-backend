// import express, { Router } from 'express';
// import { createRideEvent, endRideEvent, getChatMessages, getRideEventDetail, getRideEventLive, getRideEventSummary, listRideEvents, rateRider, rsvpRideEvent, sendChatMessage, startRideEvent, streamRideEventLocation } from '../controllers/rideEvent.controller.js';
// import isAuth from '../middlewares/auth.middleware.js';
// const router: Router = express.Router();
// // All routes require authentication
// router.use(isAuth);
// // ==================== GROUP RIDE MANAGEMENT ====================
// /**
//  * POST /api/v1/rideevents
//  * Create a new group ride event
//  */
// router.post('/', createRideEvent);
// /**
//  * GET /api/v1/rideevents
//  * List nearby/upcoming rides with filters
//  */
// router.get('/', listRideEvents);
// /**
//  * GET /api/v1/rideevents/:id
//  * Get detailed information about a ride
//  */
// router.get('/:id', getRideEventDetail);
// /**
//  * POST /api/v1/rideevents/:id/rsvp
//  * RSVP to join a group ride
//  */
// router.post('/:id/rsvp', rsvpRideEvent);
// // ==================== LIVE RIDE CONTROL ====================
// /**
//  * POST /api/v1/rideevents/:id/start
//  * Start the group ride (Organizer only)
//  */
// router.post('/:id/start', startRideEvent);
// /**
//  * PATCH /api/v1/rideevents/:id/stream
//  * Stream GPS location during ride
//  */
// router.patch('/:id/stream', streamRideEventLocation);
// /**
//  * GET /api/v1/rideevents/:id/live
//  * Get live ride data (locations, chat, stats)
//  */
// router.get('/:id/live', getRideEventLive);
// /**
//  * POST /api/v1/rideevents/:id/end
//  * End the group ride (Organizer only)
//  */
// router.post('/:id/end', endRideEvent);
// // ==================== RIDE SUMMARY & RATINGS ====================
// /**
//  * GET /api/v1/rideevents/:id/summary
//  * Get ride summary after completion
//  */
// router.get('/:id/summary', getRideEventSummary);
// /**
//  * POST /api/v1/rideevents/:id/rate/:targetUserId
//  * Rate another rider
//  */
// router.post('/:id/rate/:targetUserId', rateRider);
// // ==================== CHAT ====================
// /**
//  * POST /api/v1/rideevents/:id/chat
//  * Send a chat message in the ride
//  * REST chat is fallback only. Primary chat happens via Socket.io.
//  */
// router.post('/:id/chat', sendChatMessage);
// /**
//  * GET /api/v1/rideevents/:id/chat
//  * Get chat messages history
//  */
// router.get('/:id/chat', getChatMessages);
// export default router;
import express from 'express';
import { createRideEvent, listRideEvents, getRideEventDetail, rsvpRideEvent, startRideEvent, streamRideEventLocation, getRideEventLive, endRideEvent, getRideEventSummary, rateRider, sendChatMessage, getChatMessages } from '../controllers/rideEvent.controller';
import isAuth from '../middlewares/auth.middleware';
const router = express.Router();
router.use(isAuth);
router.post('/', createRideEvent);
router.get('/', listRideEvents);
router.get('/:id', getRideEventDetail);
router.post('/:id/rsvp', rsvpRideEvent);
router.post('/:id/start', startRideEvent);
router.patch('/:id/stream', streamRideEventLocation);
router.get('/:id/live', getRideEventLive);
router.post('/:id/end', endRideEvent);
router.get('/:id/summary', getRideEventSummary);
router.post('/:id/rate/:targetUserId', rateRider);
router.post('/:id/chat', sendChatMessage);
router.get('/:id/chat', getChatMessages);
export default router;
//# sourceMappingURL=rideEvent.routes.js.map
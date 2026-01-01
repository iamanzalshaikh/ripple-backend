import { Router } from 'express';
import isAuth from '../middlewares/auth.middleware.js';
import { getLiveSOSTracking, getSOSHistory, resolveSOSAlert, triggerSOS, updateSOSLocation } from '../controllers/soslog.controller.js';


const router = Router();

/**
 * ==================== SOS ALERTS ====================
 */

/**
 * POST /api/v1/safety/sos
 * Trigger SOS alert
 */
router.post('/sos', isAuth, triggerSOS);

/**
 * PATCH /api/v1/safety/sos/:id/location
 * Update SOS location
 */
router.patch('/sos/:id/location', isAuth, updateSOSLocation);

/**
 * POST /api/v1/safety/sos/:id/resolve
 * Mark SOS as resolved
 */
router.post('/sos/:id/resolve', isAuth, resolveSOSAlert);

/**
 * GET /api/v1/safety/sos-history
 * Get SOS history
 */
router.get('/sos-history', isAuth, getSOSHistory);

/**
 * ==================== PUBLIC LIVE TRACKING ====================
 * MUST BE LAST - no auth required
 */

/**
 * GET /api/v1/live/:token
 * Public live SOS tracking
 */
router.get('/live/:token', getLiveSOSTracking);

export default router;
import { Router } from "express";
import { getActiveRiders } from "../controllers/admin.radar.controller.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/v1/admin/radar/riders
 */
router.get("/riders", getActiveRiders);

export default router;

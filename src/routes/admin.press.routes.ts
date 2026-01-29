import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getPressRequests,
  updatePressRequestStatus,
} from "../controllers/admin.press.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/admin/press/requests
 * @desc    List press & collaboration requests
 * @access  Admin
 */
router.get("/requests", getPressRequests);

/**
 * @route   PATCH /api/admin/press/requests/:id/status
 * @desc    Update press request status and notes
 * @access  Admin
 */
router.patch("/requests/:id/status", updatePressRequestStatus);

export default router;





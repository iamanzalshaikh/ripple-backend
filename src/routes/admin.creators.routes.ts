import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  getCreatorApplications,
  approveCreatorApplication,
  rejectCreatorApplication,
} from "../controllers/admin.creators.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/admin/creators/applications
 * @desc    List creator applications
 * @access  Admin
 */
router.get("/applications", getCreatorApplications);

/**
 * @route   PATCH /api/admin/creators/applications/:id/approve
 * @desc    Approve a creator application
 * @access  Admin
 */
router.patch("/applications/:id/approve", approveCreatorApplication);

/**
 * @route   PATCH /api/admin/creators/applications/:id/reject
 * @desc    Reject a creator application
 * @access  Admin
 */
router.patch("/applications/:id/reject", rejectCreatorApplication);

export default router;





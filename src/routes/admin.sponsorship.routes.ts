import { Router } from "express";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import {
  listCampaigns,
  listCampaignApplications,
} from "../controllers/admin.sponsorship.controller.js";

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

/**
 * @route   GET /api/v1/admin/sponsorship/campaigns
 * @desc    List sponsorship campaigns for admin
 * @access  Admin
 */
router.get("/campaigns", listCampaigns);

/**
 * @route   GET /api/v1/admin/sponsorship/campaigns/:campaignId/applications
 * @desc    List creator applications for a campaign
 * @access  Admin
 */
router.get("/campaigns/:campaignId/applications", listCampaignApplications);

export default router;



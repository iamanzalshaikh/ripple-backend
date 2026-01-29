// ==========================================
// File: src/routes/sponsorship.routes.ts
// Sponsorship Routes
// ==========================================
import express, { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import adminAuth from "../middlewares/adminAuth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { uploadCampaignHeroImage } from "../controllers/campaignUpload.controller.js";
import {
  listPublicCampaigns,
  createCampaign,
  approveCampaign,
  getMatchingCampaigns,
  getMyCampaignApplications,
  applyToCampaign,
  shortlistApplication,
  rejectCampaignApplication,
  createContract,
  submitDeliverable,
  approveDeliverable,
  rejectDeliverable,
  listDeliverables,
  listMyContracts,
} from "../controllers/sponsorship.controller.js";

const router: Router = express.Router();

/**
 * @swagger
 * /api/v1/sponsorship/campaigns/public:
 *   get:
 *     summary: Public list of active campaigns
 *     tags: [Sponsorship]
 */
router.get("/campaigns/public", isAuth, listPublicCampaigns);

/**
 * @swagger
 * /api/v1/sponsorship/campaign/hero-image:
 *   post:
 *     summary: Upload hero image for a sponsorship campaign (Admin only)
 *     tags: [Sponsorship]
 */
router.post(
  "/campaign/hero-image",
  adminAuth,
  upload.single("heroImage"),
  uploadCampaignHeroImage,
);

/**
 * @swagger
 * /api/v1/sponsorship/campaign:
 *   post:
 *     summary: Create a new campaign (Admin only)
 *     tags: [Sponsorship]
 *     security:
 *       - bearerAuth: []
 */
router.post("/campaign", adminAuth, createCampaign);

/**
 * @swagger
 * /api/v1/sponsorship/campaign/:id/approve:
 *   patch:
 *     summary: Approve campaign (Admin only)
 *     tags: [Sponsorship]
 */
router.patch("/campaign/:id/approve", adminAuth, approveCampaign);

/**
 * @swagger
 * /api/v1/sponsorship/campaigns/matching:
 *   get:
 *     summary: Get matching campaigns for creator
 *     tags: [Sponsorship]
 */
router.get("/campaigns/matching", isAuth, getMatchingCampaigns);

/**
 * @swagger
 * /api/v1/sponsorship/campaigns/my-applications:
 *   get:
 *     summary: Get campaigns that creator has applied to
 *     tags: [Sponsorship]
 */
router.get("/campaigns/my-applications", isAuth, getMyCampaignApplications);

/**
 * @swagger
 * /api/v1/sponsorship/campaign/:id/apply:
 *   post:
 *     summary: Creator applies to campaign
 *     tags: [Sponsorship]
 */
router.post("/campaign/:id/apply", isAuth, applyToCampaign);

/**
 * @swagger
 * /api/v1/sponsorship/campaign/:campaignId/application/:appId/shortlist:
 *   patch:
 *     summary: Shortlist creator application (Admin only)
 *     tags: [Sponsorship]
 */
router.patch(
  "/campaign/:campaignId/application/:appId/shortlist",
  adminAuth,
  shortlistApplication
);

/**
 * @swagger
 * /api/v1/sponsorship/campaign/:campaignId/application/:appId/reject:
 *   patch:
 *     summary: Reject creator application (Admin only)
 *     tags: [Sponsorship]
 */
router.patch(
  "/campaign/:campaignId/application/:appId/reject",
  adminAuth,
  rejectCampaignApplication
);

/**
 * @swagger
 * /api/v1/sponsorship/contract:
 *   post:
 *     summary: Create contract (Admin only)
 *     tags: [Sponsorship]
 */
router.post("/contract", adminAuth, createContract);

/**
 * @swagger
 * /api/v1/sponsorship/contracts/my:
 *   get:
 *     summary: List contracts for current creator
 *     tags: [Sponsorship]
 */
router.get("/contracts/my", isAuth, listMyContracts);

/**
 * @swagger
 * /api/v1/sponsorship/deliverables:
 *   get:
 *     summary: Admin list of sponsorship deliverables
 *     tags: [Sponsorship]
 */
router.get("/deliverables", adminAuth, listDeliverables);

/**
 * @swagger
 * /api/v1/sponsorship/deliverable:
 *   post:
 *     summary: Creator submits deliverable
 *     tags: [Sponsorship]
 */
router.post("/deliverable", isAuth, submitDeliverable);

/**
 * @swagger
 * /api/v1/sponsorship/deliverable/:id/approve:
 *   patch:
 *     summary: Approve deliverable (Admin/Brand only)
 *     tags: [Sponsorship]
 */
router.patch("/deliverable/:id/approve", adminAuth, approveDeliverable);

/**
 * @swagger
 * /api/v1/sponsorship/deliverable/:id/reject:
 *   patch:
 *     summary: Reject deliverable (Admin/Brand only)
 *     tags: [Sponsorship]
 */
router.patch("/deliverable/:id/reject", adminAuth, rejectDeliverable);

export default router;




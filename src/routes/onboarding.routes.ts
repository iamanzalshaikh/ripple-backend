import express, { Router } from "express";
import isAuth from '../middlewares/auth.middleware.js';
import { checkOnboardingStatus, completeOnboarding } from "../controllers/onboarding.controller.js";


const router: Router = express.Router();

/**
 * All routes require authentication
 */


/**
 * GET /api/v1/onboarding/status
 * Check onboarding progress
 */
router.get("/status", isAuth, checkOnboardingStatus);

/**
 * PATCH /api/v1/onboarding/complete
 * Mark onboarding as complete
 */
router.patch("/complete", isAuth, completeOnboarding);

export default router;
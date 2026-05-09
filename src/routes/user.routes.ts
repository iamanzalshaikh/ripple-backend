import { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import { getPreferences, onboardingComplete } from "../controllers/user.controller.js";

const router: Router = Router();

router.post("/onboarding-complete", isAuth, onboardingComplete);
router.get("/preferences", isAuth, getPreferences);

export default router;


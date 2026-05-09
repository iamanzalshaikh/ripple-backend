import { Router } from "express";
import {
  getCurrentUser,
  login,
  logout,
  refresh,
  signup,
} from "../controllers/auth.controller.js";
import isAuth from "../middlewares/auth.middleware.js";
import { loginLimiter, signupLimiter } from "../middlewares/rateLimit.middleware.js";
import { validateBody } from "../middlewares/validate.middleware.js";
import { z } from "zod";

const router: Router = Router();

// Phase 1 (docphase1.md) + Phase 2 refresh-token rotation
const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(80).optional(),
  device: z.string().min(1).max(120).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  device: z.string().min(1).max(120).optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10).optional(),
});

router.post("/signup", signupLimiter, validateBody(signupSchema), signup);
router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.post("/refresh", validateBody(refreshSchema), refresh);

router.post("/logout", isAuth, logout);
router.get("/me", isAuth, getCurrentUser);

export default router;

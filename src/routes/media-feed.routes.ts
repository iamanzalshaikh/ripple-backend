// ==========================================
// File: src/routes/media-feed.routes.ts
// Media Feed Routes (Step 109)
// ==========================================
import express, { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import { getMediaFeed } from "../controllers/mediaFeed.controller.js";

const router: Router = express.Router();

// GET /api/v1/media-feed
router.get("/", isAuth, getMediaFeed);

export default router;


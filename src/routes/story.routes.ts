import express, { Router } from "express";
import isAuth from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import {
  createStory,
  getStoriesFeed,
  markStoryAsViewed,
} from "../controllers/story.controller.js";

const router: Router = express.Router();

// Story creation (authenticated, single file upload)
router.post("/", isAuth, upload.single("media"), createStory as any);

// Story feed (following + self)
router.get("/feed", isAuth, getStoriesFeed as any);

// Mark as viewed
router.patch("/:id/view", isAuth, markStoryAsViewed as any);

export default router;

import { Request, Response } from "express";
import Story from "../models/story.model.js";
import User from "../models/user.model.js";
import logger from "../config/logger.js";
import { uploadOnS3 } from "../config/s3.js";

interface AuthRequest extends Request {
  userId: string;
}

/**
 * POST /api/v1/stories
 * Create a new ephemeral story
 */
export const createStory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: "Media file is required for a story",
      });
    }

    // Upload to S3
    const isVideo = file.mimetype.startsWith("video/");
    const folder = isVideo ? "herridez/stories/videos" : "herridez/stories/photos";
    
    const mediaUrl = await uploadOnS3(file.buffer, folder, file.mimetype);

    if (!mediaUrl) {
      return res.status(400).json({
        success: false,
        error: "Failed to upload story media",
      });
    }

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Parse overlays if present
    let overlays = [];
    if (req.body.overlays) {
      try {
        overlays = JSON.parse(req.body.overlays);
      } catch (e) {
        logger.warn(`[createStory] Failed to parse overlays: ${req.body.overlays}`);
      }
    }

    const story = new Story({
      userId,
      mediaUrl,
      mediaType: isVideo ? "video" : "photo",
      expiresAt,
      overlays,
    });

    await story.save();
    await story.populate("userId", "name avatarUrl handle");

    logger.info(`[createStory] Story ${story._id} created by user ${userId}`);

    return res.status(201).json({
      success: true,
      data: story,
    });
  } catch (error: any) {
    logger.error(`[createStory] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/stories/feed
 * Get active stories for the home feed (self + following)
 */
export const getStoriesFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    // Get following list
    const currentUser = await User.findById(userId).select("following").lean();
    const followingIds = currentUser?.following || [];
    
    // Include self
    const userIds = [userId, ...followingIds];

    // Find all active stories from these users
    // (TTL index handles deletion, but we filter just in case or for consistency)
    const activeStories = await Story.find({
      userId: { $in: userIds },
      expiresAt: { $gt: new Date() },
    })
      .populate("userId", "name avatarUrl handle")
      .sort({ createdAt: -1 })
      .lean();

    // Group stories by user (like Instagram)
    const groupedStories: any[] = [];
    const userMap = new Map();

    activeStories.forEach((story) => {
      const storyUserId = story.userId._id.toString();
      if (!userMap.has(storyUserId)) {
        userMap.set(storyUserId, {
          user: story.userId,
          stories: [],
          hasUnviewed: false,
        });
        groupedStories.push(userMap.get(storyUserId));
      }

      const userGroup = userMap.get(storyUserId);
      userGroup.stories.push(story);
      
      // Check if this specific story is unviewed by current user
      const isViewed = story.viewers.some((vId: any) => vId.toString() === userId);
      if (!isViewed) {
        userGroup.hasUnviewed = true;
      }
    });

    // Sort: Users with unviewed stories first, then by latest story
    groupedStories.sort((a, b) => {
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return b.stories[0].createdAt.getTime() - a.stories[0].createdAt.getTime();
    });

    return res.json({
      success: true,
      data: groupedStories,
    });
  } catch (error: any) {
    logger.error(`[getStoriesFeed] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/stories/:id/view
 * Mark a story as viewed
 */
export const markStoryAsViewed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const storyId = req.params.id;

    await Story.findByIdAndUpdate(
      storyId,
      { $addToSet: { viewers: userId } },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Story marked as viewed",
    });
  } catch (error: any) {
    logger.error(`[markStoryAsViewed] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

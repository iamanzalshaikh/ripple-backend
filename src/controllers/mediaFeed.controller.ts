// ==========================================
// File: src/controllers/mediaFeed.controller.ts
// Media Feed Controller (Step 109)
// ==========================================
import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
import Post from "../models/post.model.js";
import logger from "../config/logger.js";

/**
 * GET /api/v1/media-feed
 * Get featured sponsored posts from verified creators
 */
export const getMediaFeed = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 20;
    const skip = (pageNumber - 1) * limitNumber;

    // Get sponsored posts from verified creators
    const posts = await Post.find({
      isSponsored: true,
    })
      .populate("userId", "name avatarUrl handle isCreator")
      .populate("sponsorBrandId", "name logo")
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .skip(skip)
      .lean();

    // Filter to only show posts from verified creators
    const filteredPosts = posts.filter(
      (post: any) => post.userId?.isCreator === true
    );

    const total = await Post.countDocuments({ isSponsored: true });

    res.json({
      success: true,
      data: filteredPosts,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error: any) {
    logger.error(`Error in getMediaFeed: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch media feed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};





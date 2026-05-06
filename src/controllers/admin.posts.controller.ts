import { Request, Response } from "express";
import Post from "../models/post.model.js";
import logger from "../config/logger.js";
import { recordAuditAction } from "./admin.audit.controller.js";

/**
 * @desc    Get all posts for moderation
 * @route   GET /api/v1/admin/posts
 */
export const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.search) {
      query.caption = { $regex: req.query.search, $options: "i" };
    }

    const posts = await Post.find(query)
      .populate("userId", "name avatarUrl handle email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments(query);

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error(`getAllPosts error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch posts" });
  }
};

/**
 * @desc    Delete a post (Administrative)
 * @route   DELETE /api/v1/admin/posts/:id
 */
export const adminDeletePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({ success: false, message: "Post not found" });
      return;
    }

    const userId = post.userId;
    const caption = post.caption;

    await post.deleteOne();

    // Record Audit Log
    await recordAuditAction({
      adminId: (req as any).admin?._id || (req as any).adminId,
      action: "POST_DELETED",
      targetType: "POST",
      targetId: post._id as any,
      details: `Admin deleted post: "${caption?.substring(0, 50)}..." by User ID: ${userId}`,
      metadata: { postCaption: caption, userId }
    });

    res.status(200).json({
      success: true,
      message: "Post successfully purged from platform",
    });
  } catch (error: any) {
    logger.error(`adminDeletePost error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to delete post" });
  }
};

/**
 * @desc    Get post statistics for moderation dashboard
 * @route   GET /api/v1/admin/posts/stats
 */
export const getPostStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalPosts = await Post.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        totalPosts,
        reportedPosts: 0,
        engagementRate: "4.2%"
      },
    });
  } catch (error: any) {
    logger.error(`getPostStats error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch post stats" });
  }
};

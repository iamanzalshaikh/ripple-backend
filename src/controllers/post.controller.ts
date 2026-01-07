
import { Request, Response } from "express";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import Ride from "../models/ride.model.js";
import logger from "../config/logger.js";
import postQueue from "../queues/post.queue.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

interface AuthRequest extends Request {
  userId: string;
}

/**
 * POST /api/v1/posts
 * Create a new post with Cloudinary image upload
 *
 * MULTIPART FORM DATA (NOT JSON)
 *
 * Form Fields:
 * - caption: string (optional)
 * - privacy: 'private' | 'friends' | 'public' (default: 'friends')
 * - rideId: string (optional)
 * - location: JSON string (optional)
 *
 * Files:
 * - media: Array of image/video files
 */
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { caption, privacy = "friends", rideId, location } = req.body;
    const userId = req.userId;
    const files = req.files as Express.Multer.File[] | undefined;

    logger.info(`[createPost] User ${userId} creating post`);

    // Validation
    if (!caption && (!files || files.length === 0)) {
      return res.status(400).json({
        success: false,
        error: "Post must have caption or media",
      });
    }

    if (caption && caption.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Caption too long (max 2000 characters)",
      });
    }

    if (!["private", "friends", "public"].includes(privacy)) {
      return res.status(400).json({
        success: false,
        error: "Invalid privacy setting",
      });
    }

    // Verify ride if provided
    if (rideId) {
      const ride = await Ride.findOne({ _id: rideId, userId });
      if (!ride) {
        return res.status(404).json({
          success: false,
          error: "Ride not found",
        });
      }
    }

    // ✅ UPLOAD FILES TO CLOUDINARY
    const mediaArray = [];

    if (files && files.length > 0) {
      logger.info(`[createPost] Uploading ${files.length} files to Cloudinary`);

      for (const file of files) {
        try {
          // Determine if it's a video or image
          const isVideo = file.mimetype.startsWith("video/");
          const folder = isVideo ? "herridez/videos" : "herridez/posts";

          // Upload to Cloudinary
          const imageUrl = await uploadOnCloudinary(file.buffer, folder);

          if (imageUrl) {
            mediaArray.push({
              url: imageUrl,
              type: isVideo ? "video" : "photo",
            });
            logger.info(`[createPost] File uploaded: ${imageUrl}`);
          } else {
            logger.warn(
              `[createPost] Failed to upload file: ${file.originalname}`
            );
          }
        } catch (uploadError: any) {
          logger.error(
            `[createPost] Upload error for ${file.originalname}: ${uploadError.message}`
          );
          // Continue with other files instead of failing completely
        }
      }

      if (mediaArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Failed to upload media. Please try again.",
        });
      }
    }

    // Parse location if provided
    let parsedLocation = null;
    if (location) {
      try {
        parsedLocation = JSON.parse(location);
      } catch (e) {
        logger.warn(`[createPost] Invalid location JSON`);
      }
    }

    // Create post
    const post = new Post({
      userId,
      caption: caption || "",
      media: mediaArray,
      rideId: rideId || null,
      location: parsedLocation || null,
      privacy,
    });

    await post.save();
    await post.populate("userId", "name avatar");
    if (rideId) {
      await post.populate("rideId");
    }

    logger.info(
      `[createPost] Post ${post._id} created with ${mediaArray.length} media files`
    );

    // TODO: Notify followers - to be reimplemented by backend dev
    // if (privacy !== 'private') {
    //   const poster = await User.findById(userId).select('name avatar');
    //   await postQueue.add('notify-followers', {
    //     postId: post._id,
    //     userId,
    //     userName: poster?.name || 'Someone',
    //     userAvatar: poster?.avatarUrl
    //   });
    // }

    return res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error: any) {
    logger.error(`[createPost] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/posts/feed
 * Get personalized feed - shows public posts from all users except current user
 */
export const getFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    logger.info(`[getFeed] Fetching feed for user ${userId}`);

    // Get all public and friends posts from OTHER users (not current user)
    // Since followers/following isn't fully implemented, show all other users' public posts
    const posts = await Post.find({
      // userId: { $ne: userId }, // Exclude current user's posts
      privacy: "public", // Only public posts for now
    })
      .populate("userId", "name avatar handle")
      .populate("rideId", "distance duration avgSpeed maxSpeed")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Post.countDocuments({
      userId: { $ne: userId },
      privacy: "public",
    });

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getFeed] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/posts/me
 * Get current user's posts
 */
export const getMyPosts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    logger.info(`[getMyPosts] Fetching posts for user ${userId}`);

    const posts = await Post.find({ userId })
      .populate("userId", "name avatar handle")
      .populate("rideId", "distance duration avgSpeed maxSpeed")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Post.countDocuments({ userId });

    return res.json({
      success: true,
      data: posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getMyPosts] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/posts/:id/like
 * Like or unlike a post
 */
export const likePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    logger.info(`[likePost] User ${userId} liking post ${postId}`);

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    const alreadyLiked = post.likes.some((id) => id.toString() === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== userId);
      post.likeCount = Math.max(0, post.likeCount - 1);
      await post.save();

      logger.info(`[likePost] Post ${postId} unliked by ${userId}`);

      return res.json({
        success: true,
        data: {
          liked: false,
          likeCount: post.likeCount,
        },
      });
    } else {
      post.likes.push(userId as any);
      post.likeCount += 1;
      await post.save();

      logger.info(`[likePost] Post ${postId} liked by ${userId}`);

      if (post.userId.toString() !== userId) {
        const liker = await User.findById(userId).select("name avatar");

        await postQueue.add("send-notification", {
          type: "like",
          userId: post.userId,
          fromUserId: userId,
          fromUserName: liker?.name || "Someone",
          fromUserAvatar: liker?.avatarUrl,
          postId: post._id,
          message: `${liker?.name || "Someone"} liked your post`,
        });
      }

      return res.json({
        success: true,
        data: {
          liked: true,
          likeCount: post.likeCount,
        },
      });
    }
  } catch (error: any) {
    logger.error(`[likePost] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/posts/:id/comment
 * Add comment to post
 */
export const commentPost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const { text } = req.body;

    logger.info(`[commentPost] User ${userId} commenting on post ${postId}`);

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Comment cannot be empty" });
    }

    if (text.length > 1000) {
      return res
        .status(400)
        .json({ success: false, error: "Comment too long" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    const comment = new Comment({
      postId,
      userId,
      text: text.trim(),
    });

    await comment.save();

    post.comments.push(comment._id);
    post.commentCount += 1;
    await post.save();

    await comment.populate("userId", "name avatar handle");

    logger.info(`[commentPost] Comment ${comment._id} created`);

    if (post.userId.toString() !== userId) {
      const commenter = await User.findById(userId).select("name avatar");

      await postQueue.add("send-notification", {
        type: "comment",
        userId: post.userId,
        fromUserId: userId,
        fromUserName: commenter?.name || "Someone",
        fromUserAvatar: commenter?.avatarUrl,
        postId: post._id,
        commentId: comment._id,
        commentText: comment.text, // Include actual comment text
        message: `${commenter?.name || "Someone"} commented on your post`,
      });
    }

    return res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error: any) {
    logger.error(`[commentPost] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/posts/:id/comments
 * Get all comments on a post
 */
export const getComments = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const comments = await Comment.find({ postId })
      .populate("userId", "name avatar handle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Comment.countDocuments({ postId });

    return res.json({
      success: true,
      data: comments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getComments] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/v1/posts/:id
 * Delete own post
 */
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const post = await Post.findOne({ _id: postId, userId });
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    await Comment.deleteMany({ postId });
    await Post.deleteOne({ _id: postId });

    logger.info(`[deletePost] Post ${postId} deleted`);

    return res.json({
      success: true,
      data: { message: "Post deleted" },
    });
  } catch (error: any) {
    logger.error(`[deletePost] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/v1/posts/:postId/comments/:commentId
 * Delete own comment
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    const { postId, commentId } = req.params;
    const userId = req.userId;

    const comment = await Comment.findOne({ _id: commentId, userId });
    if (!comment) {
      return res
        .status(404)
        .json({ success: false, error: "Comment not found" });
    }

    await Post.updateOne(
      { _id: postId },
      {
        $pull: { comments: commentId },
        $inc: { commentCount: -1 },
      }
    );

    await Comment.deleteOne({ _id: commentId });

    logger.info(`[deleteComment] Comment ${commentId} deleted`);

    return res.json({
      success: true,
      data: { message: "Comment deleted" },
    });
  } catch (error: any) {
    logger.error(`[deleteComment] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

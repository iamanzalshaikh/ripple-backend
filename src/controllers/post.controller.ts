import { Request, Response } from "express";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import Ride from "../models/ride.model.js";
import logger from "../config/logger.js";
import postQueue from "../queues/post.queue.js";
import { uploadOnS3 } from "../config/s3.js";

interface AuthRequest extends Request {
  userId: string;
}

/**
 * POST /api/v1/posts
 * Create a new post with AWS S3 image upload
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
    const {
      caption,
      privacy = "friends",
      rideId,
      location,
      taggedUsers,
    } = req.body;
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

    // ✅ UPLOAD FILES TO AWS S3
    const mediaArray = [];

    if (files && files.length > 0) {
      logger.info(`[createPost] Uploading ${files.length} files to AWS S3`);

      for (const file of files) {
        try {
          // Determine if it's a video or image
          const isVideo = file.mimetype.startsWith("video/");
          const folder = isVideo ? "herridez/videos" : "herridez/posts";

          // Upload to AWS S3
          const imageUrl = await uploadOnS3(file.buffer, folder, file.mimetype);

          if (imageUrl) {
            mediaArray.push({
              url: imageUrl,
              type: isVideo ? "video" : "photo",
            });
            logger.info(`[createPost] File uploaded: ${imageUrl}`);
          } else {
            logger.warn(
              `[createPost] Failed to upload file: ${file.originalname}`,
            );
          }
        } catch (uploadError: any) {
          logger.error(
            `[createPost] Upload error for ${file.originalname}: ${uploadError.message}`,
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

    // Parse and validate taggedUsers
    let parsedTaggedUsers: string[] = [];
    if (taggedUsers) {
      try {
        parsedTaggedUsers =
          typeof taggedUsers === "string"
            ? JSON.parse(taggedUsers)
            : Array.isArray(taggedUsers)
              ? taggedUsers
              : [];

        // Validate all tagged users exist and remove duplicates
        if (parsedTaggedUsers.length > 0) {
          // Filter out current user and validate users exist
          const filteredUserIds = parsedTaggedUsers.filter(
            (id) => id.toString() !== userId,
          );

          const validUsers = await User.find({
            _id: { $in: filteredUserIds },
          }).select("_id");

          const validUserIds = validUsers.map((u) => u._id.toString());
          parsedTaggedUsers = [...new Set(validUserIds)]; // Remove duplicates

          if (parsedTaggedUsers.length > 10) {
            return res.status(400).json({
              success: false,
              error: "Maximum 10 users can be tagged in a post",
            });
          }
        }
      } catch (e) {
        logger.warn(`[createPost] Invalid taggedUsers format`);
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
      taggedUsers: parsedTaggedUsers,
    });

    await post.save();
    await post.populate("userId", "name avatar");
    if (rideId) {
      await post.populate("rideId");
    }

    logger.info(
      `[createPost] Post ${post._id} created with ${mediaArray.length} media files and ${parsedTaggedUsers.length} tagged users`,
    );

    // Send notifications to tagged users
    if (parsedTaggedUsers.length > 0) {
      const poster = await User.findById(userId).select("name avatarUrl");

      for (const taggedUserId of parsedTaggedUsers) {
        if (taggedUserId !== userId) {
          await postQueue.add("send-notification", {
            type: "tag",
            userId: taggedUserId,
            fromUserId: userId,
            fromUserName: poster?.name || "Someone",
            fromUserAvatar: poster?.avatarUrl,
            postId: post._id,
            message: `${poster?.name || "Someone"} tagged you in a post`,
          });
        }
      }
    }

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
      .populate("userId", "name avatarUrl handle")
      .populate("rideId", "distance duration avgSpeed maxSpeed")
      .populate("taggedUsers", "name avatarUrl handle")
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
 * ============================================
 * GET HOME FEED
 * ============================================
 * Show ONLY posts from users that current user FOLLOWS
 */
// export const getFeed = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const userId = req.userId;
//     const { page = 1, limit = 10 } = req.query;

//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//       return;
//     }

//     const pageNum = Math.max(1, parseInt(page as string) || 1);
//     const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
//     const skip = (pageNum - 1) * limitNum;

//     logger.info(`[getFeed] Fetching feed for user ${userId}`);

//     // ============================================
//     // STEP 1: Get current user's following list
//     // ============================================
//     const currentUser = await User.findById(userId).select('following').lean();

//     if (!currentUser) {
//       res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//       return;
//     }

//     const followingList = currentUser.following || [];

//     logger.debug(
//       `[getFeed] User ${userId} is following ${followingList.length} users`
//     );

//     // ============================================
//     // STEP 2: If user follows nobody, return empty feed
//     // ============================================
//     if (followingList.length === 0) {
//       res.status(200).json({
//         success: true,
//         message: "No posts - start following users to see their posts!",
//         data: {
//           posts: [],
//           pagination: {
//             page: pageNum,
//             limit: limitNum,
//             total: 0,
//             pages: 0,
//           },
//         },
//       });
//       return;
//     }

//     // ============================================
//     // STEP 3: Query posts from following users
//     // Show:
//     // - All public posts from people you follow
//     // - Friends posts from people you follow (since you follow them, you can see their friends posts)
//     // ============================================
//     const feedQuery = {
//       userId: { $in: followingList },  // Posts from users in following list
//       privacy: { $in: ['public', 'friends'] },  // Show public and friends posts
//     };

//     const posts = await Post.find(feedQuery)
//       .populate('userId', 'name avatarUrl handle city ridingLevel isCreator followerCount')
//       .populate('rideId', 'title distance duration avgSpeed maxSpeed')
//       .populate('taggedUsers', 'name avatarUrl handle')
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limitNum)
//       .lean();

//     // ============================================
//     // STEP 5: Get total count for pagination
//     // ============================================
//     const total = await Post.countDocuments(feedQuery);

//     logger.info(
//       `[getFeed] Found ${posts.length} posts for user ${userId} (page ${pageNum})`
//     );

//     res.status(200).json({
//       success: true,
//       message: "Feed fetched successfully",
//       data: {
//         posts: posts.map(formatPost),
//         followingCount: followingList.length,
//         pagination: {
//           page: pageNum,
//           limit: limitNum,
//           total,
//           pages: Math.ceil(total / limitNum),
//         },
//       },
//     });
//   } catch (error: any) {
//     logger.error(`[getFeed] Error: ${error.message}`);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch feed",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };

/**
 * ============================================
 * GET EXPLORE FEED
 * ============================================
 * Show ALL public posts (not just following)
 * Users can "Discover" new content here
 */
export const getExploreFeed = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    logger.info(`[getExploreFeed] Fetching explore feed for user ${userId}`);

    // ============================================
    // Show ALL public posts (including own posts)
    // ============================================
    const exploreQuery = {
      privacy: "public", // Only public posts (includes own posts)
    };

    const posts = await Post.find(exploreQuery)
      .populate(
        "userId",
        "name avatarUrl handle city state country ridingLevel isCreator followerCount currentLocation",
      )
      .populate("rideId", "title distance duration avgSpeed maxSpeed")
      .populate("taggedUsers", "name avatarUrl handle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Post.countDocuments(exploreQuery);

    logger.info(
      `[getExploreFeed] Found ${posts.length} posts (page ${pageNum})`,
    );

    res.status(200).json({
      success: true,
      message: "Explore feed fetched successfully",
      data: {
        posts: posts.map(formatPost),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[getExploreFeed] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch explore feed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * GET USER PROFILE POSTS
 * ============================================
 * Show posts from a specific user (viewed on their profile)
 *
 * Endpoint: GET /api/posts/user/:userId
 *
 * When someone clicks on a user's profile,
 * this API shows all their public/friends posts
 */
export const getUserPosts = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
    const skip = (pageNum - 1) * limitNum;

    logger.info(`[getUserPosts] Fetching posts for user ${targetUserId}`);

    // Check if viewing own profile or someone else's
    const isOwnProfile = currentUserId === targetUserId;

    const postQuery: any = {
      userId: targetUserId,
    };

    // ============================================
    // PRIVACY LOGIC:
    // - Own profile: Show ALL posts (public, friends, private)
    // - Other's profile:
    //   - Always show: public posts
    //   - Show friends posts ONLY if YOU follow them
    //   - Never show: private posts
    // ============================================
    if (!isOwnProfile) {
      // Check if current user follows target user
      const currentUser = await User.findById(currentUserId)
        .select("following")
        .lean();

      if (!currentUser) {
        res.status(404).json({
          success: false,
          message: "User not found",
        });
        return;
      }

      const currentUserFollowing = currentUser.following || [];

      // Check if current user follows target user
      const isFollowing = currentUserFollowing.some(
        (id: any) => id.toString() === targetUserId,
      );

      if (isFollowing) {
        // You follow them: show public + friends posts
        postQuery.privacy = { $in: ["public", "friends"] };
      } else {
        // You don't follow them: only show public posts
        postQuery.privacy = "public";
      }
    }
    // If isOwnProfile, show all posts (no privacy filter)

    const posts = await Post.find(postQuery)
      .populate(
        "userId",
        "name avatarUrl handle city state country ridingLevel isCreator followerCount currentLocation",
      )
      .populate("rideId", "title distance duration avgSpeed maxSpeed")
      .populate("taggedUsers", "name avatarUrl handle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Post.countDocuments(postQuery);

    logger.info(
      `[getUserPosts] Found ${posts.length} posts for user ${targetUserId}`,
    );

    res.status(200).json({
      success: true,
      message: "User posts fetched successfully",
      data: {
        userId: targetUserId,
        isOwnProfile,
        posts: posts.map(formatPost),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[getUserPosts] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user posts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * HELPER FUNCTION: Format Post
 * ============================================
 */
function formatPost(post: any) {
  return {
    _id: post._id,
    userId: post.userId,
    rideId: post.rideId,
    caption: post.caption,
    media: post.media || [],
    location: post.location,
    privacy: post.privacy,
    likes: post.likes || [],
    comments: post.comments || [],
    likeCount: post.likeCount || 0,
    commentCount: post.commentCount || 0,
    taggedUsers: post.taggedUsers || [],
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

/**
 * GET /api/v1/posts/:id
 * Get a single post by ID
 * Respects privacy settings
 */
export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    logger.info(`[getPostById] Fetching post ${postId} for user ${userId}`);

    // Find the post
    const post = await Post.findById(postId)
      .populate(
        "userId",
        "name avatarUrl handle city state country ridingLevel isCreator followerCount currentLocation",
      )
      .populate("rideId", "title distance duration avgSpeed maxSpeed")
      .populate("taggedUsers", "name avatarUrl handle")
      .lean();

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    // Check if viewing own post
    const isOwnPost = post.userId._id.toString() === userId;

    // ============================================
    // PRIVACY CHECK:
    // - Own post: Always show
    // - Public post: Everyone can see
    // - Friends post: Only if you follow the post owner
    // - Private post: Only post owner can see
    // ============================================
    if (!isOwnPost) {
      if (post.privacy === "private") {
        return res.status(403).json({
          success: false,
          message: "This post is private",
        });
      }

      if (post.privacy === "friends") {
        // Check if current user follows the post owner
        const currentUser = await User.findById(userId)
          .select("following")
          .lean();

        if (!currentUser) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        const currentUserFollowing = currentUser.following || [];
        const postOwnerId = post.userId._id.toString();

        const isFollowing = currentUserFollowing.some(
          (id: any) => id.toString() === postOwnerId,
        );

        if (!isFollowing) {
          return res.status(403).json({
            success: false,
            message: "You need to follow this user to see their friends posts",
          });
        }
      }
    }

    logger.info(`[getPostById] Post ${postId} retrieved successfully`);

    return res.status(200).json({
      success: true,
      message: "Post fetched successfully",
      data: formatPost(post),
    });
  } catch (error: any) {
    logger.error(`[getPostById] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch post",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
      .populate("taggedUsers", "name avatarUrl handle")
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

        const { sendNotification } =
          await import("../services/notification.service.js");
        await sendNotification({
          userId: post.userId.toString(),
          type: "like",
          fromUserId: userId!,
          fromUserName: liker?.name || "Someone",
          message: `${liker?.name || "Someone"} liked your post`,
          data: {
            postId: post._id.toString(),
            actionUrl: `/posts/${post._id}`,
          },
          io: (req.app as any).io,
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

    await comment.populate("userId", "name avatarUrl avatar handle");

    logger.info(`[commentPost] Comment ${comment._id} created`);

    if (post.userId.toString() !== userId) {
      const commenter = await User.findById(userId).select("name avatar");

      const { sendNotification } =
        await import("../services/notification.service.js");
      await sendNotification({
        userId: post.userId.toString(),
        type: "comment",
        fromUserId: userId!,
        fromUserName: commenter?.name || "Someone",
        message: `${commenter?.name || "Someone"} commented on your post`,
        data: {
          postId: post._id.toString(),
          commentId: comment._id.toString(),
          commentText: comment.text,
          actionUrl: `/posts/${post._id}`,
        },
        io: (req.app as any).io,
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

    const topLevelFilter = {
      postId,
      // Replies are stored as Comment documents with `parentCommentId`.
      // Top-level comments either have `parentCommentId: null` or no field at all (old data).
      $or: [
        { parentCommentId: null },
        { parentCommentId: { $exists: false } },
      ],
    };

    const comments = await Comment.find(topLevelFilter)
      .populate("userId", "name avatarUrl avatar handle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Comment.countDocuments(topLevelFilter);

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
 * POST /api/v1/posts/:id/comments/:commentId/reply
 * Create a reply to a top-level comment.
 *
 * Note: replies are stored as Comment documents using `parentCommentId`
 * but they are NOT counted in `post.commentCount` (only top-level comments are).
 */
export const replyToComment = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { commentId } = req.params;
    const userId = req.userId;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Reply cannot be empty" });
    }

    if (text.length > 1000) {
      return res
        .status(400)
        .json({ success: false, error: "Reply too long" });
    }

    const parentComment = await Comment.findOne({ _id: commentId, postId });
    if (!parentComment) {
      return res.status(404).json({ success: false, error: "Comment not found" });
    }

    const reply = new Comment({
      postId,
      userId,
      text: text.trim(),
      parentCommentId: commentId,
    });

    await reply.save();
    await reply.populate("userId", "name avatarUrl avatar handle");

    return res.status(201).json({
      success: true,
      data: reply,
    });
  } catch (error: any) {
    logger.error(`[replyToComment] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/posts/:id/comments/:commentId/replies
 * Get replies for a specific comment (paginated).
 */
export const getCommentReplies = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const { commentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const replies = await Comment.find({ postId, parentCommentId: commentId })
      .populate("userId", "name avatarUrl avatar handle")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Comment.countDocuments({
      postId,
      parentCommentId: commentId,
    });

    return res.json({
      success: true,
      data: {
        replies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[getCommentReplies] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/posts/:id/tag
 * Tag users in a post
 *
 * Body: { "userIds": ["userId1", "userId2", ...] }
 */
export const tagUsers = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const { userIds } = req.body;

    logger.info(`[tagUsers] User ${userId} tagging users in post ${postId}`);

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "userIds array is required and must not be empty",
      });
    }

    if (userIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: "Maximum 10 users can be tagged in a post",
      });
    }

    // Find the post
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check if user owns the post or is tagged (can add more tags)
    const isOwner = post.userId.toString() === userId;
    const isTagged = post.taggedUsers.some((id) => id.toString() === userId);

    if (!isOwner && !isTagged) {
      return res.status(403).json({
        success: false,
        error:
          "You can only tag users in your own posts or posts you're tagged in",
      });
    }

    // Validate all user IDs exist
    const validUsers = await User.find({
      _id: { $in: userIds },
    }).select("_id name avatarUrl");

    const validUserIds = validUsers.map((u) => u._id.toString());
    const invalidUserIds = userIds.filter(
      (id) => !validUserIds.includes(id.toString()),
    );

    if (invalidUserIds.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid user IDs: ${invalidUserIds.join(", ")}`,
      });
    }

    // Remove duplicates and exclude the post owner
    const newTaggedUsers = [
      ...new Set(validUserIds.filter((id) => id !== post.userId.toString())),
    ];

    // Get currently tagged users
    const currentTaggedUsers = post.taggedUsers.map((id) => id.toString());

    // Find newly tagged users (users not already tagged)
    const newlyTaggedUsers = newTaggedUsers.filter(
      (id) => !currentTaggedUsers.includes(id),
    );

    // Update post with all tagged users
    post.taggedUsers = newTaggedUsers as any;
    await post.save();

    logger.info(
      `[tagUsers] Post ${postId} updated with ${newTaggedUsers.length} tagged users (${newlyTaggedUsers.length} newly tagged)`,
    );

    // Send notifications to newly tagged users
    if (newlyTaggedUsers.length > 0) {
      const tagger = await User.findById(userId).select("name avatarUrl");
      const { sendNotification } =
        await import("../services/notification.service.js");

      for (const taggedUserId of newlyTaggedUsers) {
        await sendNotification({
          userId: taggedUserId,
          type: "tag",
          fromUserId: userId!,
          fromUserName: tagger?.name || "Someone",
          message: `${tagger?.name || "Someone"} tagged you in a post`,
          data: {
            postId: post._id.toString(),
            actionUrl: `/posts/${post._id}`,
          },
          io: (req.app as any).io,
        });
      }
    }

    // Populate tagged users for response
    await post.populate("taggedUsers", "name avatarUrl handle");

    return res.status(200).json({
      success: true,
      message: "Users tagged successfully",
      data: {
        post: {
          _id: post._id,
          taggedUsers: post.taggedUsers,
        },
        newlyTagged: newlyTaggedUsers.length,
      },
    });
  } catch (error: any) {
    logger.error(`[tagUsers] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * PATCH /api/v1/posts/:id
 * Update/edit a post
 * Can update: caption, privacy, location, rideId
 */
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;
    const { caption, privacy, location, rideId } = req.body;

    logger.info(`[updatePost] User ${userId} updating post ${postId}`);

    // Find the post
    const post = await Post.findOne({ _id: postId, userId });

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found or you don't have permission to edit it",
      });
    }

    // Build update object
    const updates: any = {};

    // Update caption if provided
    if (caption !== undefined) {
      if (caption.length > 2000) {
        return res.status(400).json({
          success: false,
          error: "Caption too long (max 2000 characters)",
        });
      }
      updates.caption = caption;
    }

    // Update privacy if provided
    if (privacy !== undefined) {
      if (!["private", "friends", "public"].includes(privacy)) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid privacy setting. Must be 'private', 'friends', or 'public'",
        });
      }
      updates.privacy = privacy;
    }

    // Update location if provided
    if (location !== undefined) {
      try {
        const parsedLocation =
          typeof location === "string" ? JSON.parse(location) : location;

        if (parsedLocation && typeof parsedLocation === "object") {
          updates.location = {
            lat: parsedLocation.lat,
            lng: parsedLocation.lng,
            name: parsedLocation.name || null,
          };
        } else if (location === null) {
          updates.location = null;
        }
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: "Invalid location format",
        });
      }
    }

    // Update rideId if provided
    if (rideId !== undefined) {
      if (rideId === null || rideId === "") {
        updates.rideId = null;
      } else {
        // Verify ride belongs to user
        const ride = await Ride.findOne({ _id: rideId, userId });
        if (!ride) {
          return res.status(404).json({
            success: false,
            error: "Ride not found or doesn't belong to you",
          });
        }
        updates.rideId = rideId;
      }
    }

    // Check if there are any updates
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No valid fields provided to update",
      });
    }

    // Update the post
    Object.assign(post, updates);
    await post.save();

    // Populate fields for response
    await post.populate(
      "userId",
      "name avatarUrl handle city ridingLevel isCreator followerCount",
    );
    if (post.rideId) {
      await post.populate(
        "rideId",
        "title distance duration avgSpeed maxSpeed",
      );
    }
    await post.populate("taggedUsers", "name avatarUrl handle");

    logger.info(`[updatePost] Post ${postId} updated successfully`);

    return res.status(200).json({
      success: true,
      message: "Post updated successfully",
      data: formatPost(post),
    });
  } catch (error: any) {
    logger.error(`[updatePost] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to update post",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
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
      },
    );

    await Comment.deleteOne({ _id: commentId });

    // If this comment had replies, remove them too.
    await Comment.deleteMany({ postId, parentCommentId: commentId });

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

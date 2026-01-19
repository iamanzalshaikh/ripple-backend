import { Response } from "express";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import { AuthRequest } from "../types/auth.types.js";
import { IApiResponse } from "../types/index.js";
import logger from "../config/logger.js";
import { sendNotificationToUser } from "../config/socket.js";
import { Server as SocketIOServer } from "socket.io";

/**
 * ============================================
 * FOLLOW USER API
 * ============================================
 * Add userToFollowId to current user's "following" array
 * Add currentUserId to userToFollowId's "followers" array
 * Update followerCount and followingCount
 * Send real-time notification via Socket.io
 */
export const followUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.userId;
    const { userIdToFollow } = req.params;

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Validation: Can't follow yourself
    if (currentUserId === userIdToFollow) {
      res.status(400).json({
        success: false,
        message: "You cannot follow yourself",
      });
      return;
    }

    // Check if user to follow exists
    const userToFollow = await User.findById(userIdToFollow);
    if (!userToFollow) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if already following
    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: "Current user not found",
      });
      return;
    }

    // Check if already following
    if (currentUser.following.includes(userIdToFollow)) {
      res.status(400).json({
        success: false,
        message: "Already following this user",
      });
      return;
    }

    // STEP 1: Add to current user's following array
    currentUser.following.push(userIdToFollow);
    currentUser.followingCount = currentUser.following.length;
    await currentUser.save();

    // STEP 2: Add to followed user's followers array
    userToFollow.followers.push(currentUserId);
    userToFollow.followerCount = userToFollow.followers.length;
    await userToFollow.save();

    // STEP 3: Send notification via unified service
    try {
      const { sendNotification } =
        await import("../services/notification.service.js");
      await sendNotification({
        userId: userIdToFollow,
        type: "follow",
        fromUserId: currentUserId,
        fromUserName: currentUser.name,
        message: `${currentUser.name} started following you`,
        data: {
          userHandle: currentUser.handle,
          actionUrl: `/profile/${currentUser.handle || currentUserId}`,
        },
        io: (req.app as any).io,
      });
      logger.info(`[followUser] Notification sent via unified service`);
    } catch (notifError: any) {
      logger.error(
        `[followUser] Failed to send notification: ${notifError.message}`
      );
      // Don't fail the follow operation if notification fails
    }

    logger.info(`[followUser] ${currentUserId} followed ${userIdToFollow}`);

    const response: IApiResponse = {
      success: true,
      message: "Successfully followed user",
      data: {
        follow: {
          followerId: currentUserId,
          followingId: userIdToFollow,
          followedUserName: userToFollow.name,
          timestamp: new Date(),
        },
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`[followUser] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to follow user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * UNFOLLOW USER API
 * ============================================
 * Remove userToUnfollowId from current user's "following" array
 * Remove currentUserId from userToUnfollowId's "followers" array
 * Update counts
 */
export const unfollowUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.userId;
    const { userIdToUnfollow } = req.params;

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // Check if user exists
    const userToUnfollow = await User.findById(userIdToUnfollow);
    if (!userToUnfollow) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: "Current user not found",
      });
      return;
    }

    // Check if not following
    if (!currentUser.following.includes(userIdToUnfollow)) {
      res.status(400).json({
        success: false,
        message: "Not following this user",
      });
      return;
    }

    // STEP 1: Remove from current user's following array
    currentUser.following = currentUser.following.filter(
      (id: string) => id.toString() !== userIdToUnfollow.toString()
    );
    currentUser.followingCount = currentUser.following.length;
    await currentUser.save();

    // STEP 2: Remove from followed user's followers array
    userToUnfollow.followers = userToUnfollow.followers.filter(
      (id: string) => id.toString() !== currentUserId.toString()
    );
    userToUnfollow.followerCount = userToUnfollow.followers.length;
    await userToUnfollow.save();

    logger.info(
      `[unfollowUser] ${currentUserId} unfollowed ${userIdToUnfollow}`
    );

    const response: IApiResponse = {
      success: true,
      message: "Successfully unfollowed user",
      data: {
        unfollow: {
          followerId: currentUserId,
          followingId: userIdToUnfollow,
          unfollowedUserName: userToUnfollow.name,
          timestamp: new Date(),
        },
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`[unfollowUser] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to unfollow user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * GET FOLLOWERS API
 * ============================================
 * Get all users who follow a specific user
 * Paginated with user details
 * Shows: name, handle, avatar, city, ridingLevel, isCreator, followerCount
 */
export const getFollowers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 20)
    );
    const skip = (pageNum - 1) * limitNum;

    // Check if user exists
    const user = await User.findById(userId).select(
      "followers followerCount name"
    );
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const totalFollowers = user.followerCount || 0;

    // Get follower details with pagination
    const followers = await User.find({ _id: { $in: user.followers } })
      .select(
        "name handle avatarUrl bio city ridingLevel isCreator followerCount totalDistance"
      )
      .limit(limitNum)
      .skip(skip)
      .sort({ followerCount: -1 })
      .lean();

    const totalPages = Math.ceil(totalFollowers / limitNum);

    logger.info(
      `[getFollowers] Fetched followers for user ${userId}, page ${pageNum}`
    );

    const response: IApiResponse = {
      success: true,
      message: "Followers fetched successfully",
      data: {
        userId,
        userName: user.name,
        followers: followers.map(formatUserCard),
        pagination: {
          total: totalFollowers,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`[getFollowers] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch followers",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * GET FOLLOWING API
 * ============================================
 * Get all users that a specific user follows
 * Paginated with user details
 * Shows: name, handle, avatar, city, ridingLevel, isCreator, followerCount
 */
export const getFollowing = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 20)
    );
    const skip = (pageNum - 1) * limitNum;

    // Check if user exists
    const user = await User.findById(userId).select(
      "following followingCount name"
    );
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const totalFollowing = user.followingCount || 0;

    // Get following details with pagination
    const following = await User.find({ _id: { $in: user.following } })
      .select(
        "name handle avatarUrl bio city ridingLevel isCreator followerCount totalDistance"
      )
      .limit(limitNum)
      .skip(skip)
      .sort({ followerCount: -1 })
      .lean();

    const totalPages = Math.ceil(totalFollowing / limitNum);

    logger.info(
      `[getFollowing] Fetched following for user ${userId}, page ${pageNum}`
    );

    const response: IApiResponse = {
      success: true,
      message: "Following fetched successfully",
      data: {
        userId,
        userName: user.name,
        following: following.map(formatUserCard),
        pagination: {
          total: totalFollowing,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`[getFollowing] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch following",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * CHECK FOLLOW STATUS API
 * ============================================
 * Check if current user follows target user
 * Returns: isFollowing (boolean)
 */
export const checkFollowStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const currentUserId = req.userId;
    const { userIdToCheck } = req.params;

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const currentUser = await User.findById(currentUserId)
      .select("following")
      .lean();
    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: "Current user not found",
      });
      return;
    }

    // Check if following (handle both ObjectId and string comparisons)
    const isFollowing = currentUser.following.some(
      (id: any) => id.toString() === userIdToCheck.toString()
    );

    const response: IApiResponse = {
      success: true,
      message: "Follow status checked",
      data: {
        currentUserId,
        targetUserId: userIdToCheck,
        isFollowing,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`[checkFollowStatus] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to check follow status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * ============================================
 * GET FOLLOWER COUNT API
 * ============================================
 * Quick endpoint to get follower/following counts
 */
export const getFollowCounts = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select("followerCount followingCount name")
      .lean();

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const response: IApiResponse = {
      success: true,
      message: "Follow counts fetched",
      data: {
        userId,
        userName: user.name,
        followerCount: user.followerCount || 0,
        followingCount: user.followingCount || 0,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`[getFollowCounts] Error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch follow counts",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Format user data for card display
 */
function formatUserCard(user: any) {
  return {
    _id: user._id,
    name: user.name || "Anonymous",
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    ridingLevel: user.ridingLevel,
    isCreator: user.isCreator,
    followerCount: user.followerCount || 0,
    totalDistance: user.totalDistance || 0,
  };
}

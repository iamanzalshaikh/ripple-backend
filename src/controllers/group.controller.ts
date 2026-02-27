import { Request, Response } from "express";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";
import ChatMessage from "../models/chatMessage.model.js";
import logger from "../config/logger.js";
import { v4 as uuidv4 } from "uuid";
import {
  sendNotificationToUser,
  sendNotificationToUsers,
} from "../config/socket.js";
import { Server as SocketIOServer } from "socket.io";

interface AuthRequest extends Request {
  userId: string;
}

import { uploadOnCloudinary } from "../config/cloudinary.js";

/**
 * POST /api/v1/groups
 * Create a new group (verified users only)
 */
export const createGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const {
      name,
      description,
      location,
      privacy = "public",
      tags = [],
    } = req.body;
    const creatorId = req.userId;

    logger.info(`[createGroup] User ${creatorId} creating group: ${name}`);

    if (!name || name.trim().length === 0) {
      res.status(400).json({ success: false, error: "Group name required" });
      return;
    }

    // Verify user is verified
    const creator = await User.findById(creatorId);
    if (!creator) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    if (!creator.verified) {
      res
        .status(403)
        .json({ success: false, error: "Must be verified to create group" });
      return;
    }

    // Handle file uploads
    let avatarUrl = req.body.avatarUrl; // Allow passing URL directly if already uploaded
    let coverUrl = req.body.coverUrl;

    const files = (req as any).files;
    if (files) {
      // Upload avatar
      if (files.avatar && files.avatar[0]) {
        try {
          const uploaded = await uploadOnCloudinary(
            files.avatar[0].buffer,
            "heridez/groups/avatars",
          );
          if (uploaded) avatarUrl = uploaded;
        } catch (err: any) {
          logger.error(`[createGroup] Avatar upload failed: ${err.message}`);
        }
      }

      // Upload cover
      if (files.cover && files.cover[0]) {
        try {
          const uploaded = await uploadOnCloudinary(
            files.cover[0].buffer,
            "heridez/groups/covers",
          );
          if (uploaded) coverUrl = uploaded;
        } catch (err: any) {
          logger.error(`[createGroup] Cover upload failed: ${err.message}`);
        }
      }
    }

    // Create group
    const chatRoomId = `group-${uuidv4()}`;
    const group = new Group({
      name,
      description,
      location,
      createdBy: creatorId,
      privacy,
      avatarUrl,
      coverUrl,
      tags,
      chatRoomId,
      members: [
        {
          userId: creatorId,
          role: "admin",
          joinedAt: new Date(),
        },
      ],
      stats: {
        totalMembers: 1,
        totalRides: 0,
      },
    });

    await group.save();
    logger.info(`[createGroup] Group ${group._id} created`);

    res.status(201).json({
      success: true,
      data: {
        groupId: group._id,
        name: group.name,
        privacy: group.privacy,
        chatRoomId: group.chatRoomId,
        avatarUrl: group.avatarUrl,
        coverUrl: group.coverUrl,
      },
    });
  } catch (error: any) {
    logger.error(`[createGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * PATCH /api/v1/groups/:id
 * Update group details (admin only)
 */
export const updateGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { name, description, location, privacy, tags } = req.body;

    logger.info(`[updateGroup] User ${userId} updating group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    // Check admin permissions
    const isAdmin = group.members.some(
      (m: any) => m.userId.toString() === userId && m.role === "admin",
    );
    if (!isAdmin) {
      res
        .status(403)
        .json({ success: false, error: "Only admin can update group" });
      return;
    }

    // Handle file uploads
    const files = (req as any).files;
    if (files) {
      // Upload avatar
      if (files.avatar && files.avatar[0]) {
        try {
          const uploaded = await uploadOnCloudinary(
            files.avatar[0].buffer,
            "heridez/groups/avatars",
          );
          if (uploaded) group.avatarUrl = uploaded;
        } catch (err: any) {
          logger.error(`[updateGroup] Avatar upload failed: ${err.message}`);
        }
      }

      // Upload cover
      if (files.cover && files.cover[0]) {
        try {
          const uploaded = await uploadOnCloudinary(
            files.cover[0].buffer,
            "heridez/groups/covers",
          );
          if (uploaded) group.coverUrl = uploaded;
        } catch (err: any) {
          logger.error(`[updateGroup] Cover upload failed: ${err.message}`);
        }
      }
    }

    // Update text fields if provided
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (location !== undefined) group.location = location;
    if (privacy) group.privacy = privacy;
    if (tags) group.tags = tags;

    await group.save();

    logger.info(`[updateGroup] Group ${id} updated`);

    res.json({
      success: true,
      data: group,
    });
  } catch (error: any) {
    logger.error(`[updateGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups
 * Search groups with text search
 */
export const searchGroups = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { search = "", privacy, page = 1, limit = 10 } = req.query;
    const userId = req.userId; // Get current user ID for membership check

    let query: any = {};

    if (search) {
      query.$text = { $search: search as string };
    }

    if (privacy) {
      query.privacy = privacy;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, parseInt(limit as string) || 10);
    const skip = (pageNum - 1) * limitNum;

    const groups = await Group.find(query)
      .populate("createdBy", "name avatarUrl verified")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Group.countDocuments(query);

    // Enhanced enrichment with isMember check for current user
    const enriched = groups.map((group: any) => {
      // Check if current user is a member of this group
      const isMember =
        group.members?.some(
          (m: any) => m.userId?.toString() === userId || m.userId === userId,
        ) || false;

      return {
        ...group,
        memberCount: group.members?.length || 0,
        requestCount: group.joinRequests?.length || 0,
        isMember, // Include membership status for frontend routing
      };
    });

    logger.info(`[searchGroups] Found ${groups.length} groups`);

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[searchGroups] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups/mine
 * Get all groups where the current user is a member
 */
export const getMyGroups = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    // Find groups where current user is in members array
    const groups = await Group.find({
      "members.userId": userId,
    })
      .populate("createdBy", "name avatarUrl verified")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await Group.countDocuments({
      "members.userId": userId,
    });

    // Enrich with last message for each group
    const enriched = await Promise.all(
      groups.map(async (group: any) => {
        const lastMessage = await ChatMessage.findOne({
          groupId: group._id,
        })
          .sort({ timestamp: -1 })
          .populate("senderId", "name")
          .lean();

        return {
          ...group,
          roomId: group.chatRoomId, // Compatibility with conversation format
          lastMessage: lastMessage?.text || "No messages yet",
          lastMessageAt: lastMessage?.timestamp || group.updatedAt,
          lastMessageSender: lastMessage?.senderId?.name,
          memberCount: group.members?.length || 0,
          isMember: true,
        };
      }),
    );

    res.json({
      success: true,
      data: enriched,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getMyGroups] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups/:id
 * Get group details
 */
export const getGroupDetail = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const group = await Group.findById(id)
      .populate("createdBy", "name avatarUrl verified")
      .populate("members.userId", "name avatarUrl")
      .populate("joinRequests.userId", "name avatarUrl")
      .lean();

    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    const isMember = group.members.some(
      (m: any) => m.userId._id.toString() === userId,
    );
    const isAdmin = group.members.some(
      (m: any) => m.userId._id.toString() === userId && m.role === "admin",
    );
    const hasRequestPending = group.joinRequests.some(
      (r: any) => r.userId._id.toString() === userId,
    );

    res.json({
      success: true,
      data: {
        ...group,
        isMember,
        isAdmin,
        hasRequestPending,
        memberCount: group.members.length,
        requestCount: group.joinRequests.length,
      },
    });
  } catch (error: any) {
    logger.error(`[getGroupDetail] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/join
 * Join a group or request to join
 */
export const joinGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    logger.info(`[joinGroup] User ${userId} attempting to join group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    // Check if already a member
    const alreadyMember = group.members.some(
      (m: any) => m.userId.toString() === userId,
    );
    if (alreadyMember) {
      res.status(400).json({ success: false, error: "Already a member" });
      return;
    }

    // Check if request pending
    const hasPendingRequest = group.joinRequests.some(
      (r: any) => r.userId.toString() === userId,
    );
    if (hasPendingRequest) {
      res
        .status(400)
        .json({ success: false, error: "Join request already pending" });
      return;
    }

    // If public, auto-join
    if (group.privacy === "public") {
      group.members.push({
        userId: userId as any,
        role: "member",
        joinedAt: new Date(),
      });
      group.stats.totalMembers = group.members.length;

      await group.save();

      logger.info(`[joinGroup] User ${userId} auto-joined public group ${id}`);

      res.json({
        success: true,
        data: {
          groupId: group._id,
          status: "joined",
          message: "Successfully joined group!",
        },
      });
      return;
    }

    // If private/friends, request
    group.joinRequests.push({
      userId: userId as any,
      requestedAt: new Date(),
    });

    await group.save();

    // Get socket IO instance for real-time notifications
    const io = (req.app as any).io as SocketIOServer | null;

    // Notify admins via database notifications AND real-time socket
    const admins = group.members.filter((m: any) => m.role === "admin");
    const adminIds: string[] = [];

    for (const admin of admins) {
      const adminId = admin.userId.toString();
      adminIds.push(adminId);

      // Database notification
      await Notification.create({
        userId: adminId,
        type: "group",
        message: `${user.name || user.handle || "A user"} requested to join ${group.name}`,
        read: false,
        relatedId: group._id,
      });
    }

    // Send real-time socket notification to all admins
    if (io && adminIds.length > 0) {
      sendNotificationToUsers(io, adminIds, {
        type: "group",
        message: `${user.name || user.handle || "A user"} requested to join ${group.name}`,
      });

      // Also emit to group room for admins who are in the group chat
      io.to(`group:${id}`).emit("group-join-request", {
        groupId: id,
        requestUserId: userId,
        requestUserName: user.name || user.handle || "A user",
        requestUserAvatar: user.avatarUrl,
        timestamp: new Date(),
      });
    }

    logger.info(`[joinGroup] User ${userId} requested to join ${id}`);

    res.json({
      success: true,
      data: {
        groupId: group._id,
        status: "pending",
        message: "Join request sent to admins!",
      },
    });
  } catch (error: any) {
    logger.error(`[joinGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/approve/:requestUserId
 * Admin approves join request
 */
export const approveJoinRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id, requestUserId } = req.params;
    const adminId = req.userId;

    logger.info(
      `[approveJoinRequest] Admin ${adminId} approving ${requestUserId} for group ${id}`,
    );

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    // Verify user is admin
    const isAdmin = group.members.some(
      (m: any) => m.userId.toString() === adminId && m.role === "admin",
    );
    if (!isAdmin) {
      res.status(403).json({ success: false, error: "Only admin can approve" });
      return;
    }

    // Remove from requests
    group.joinRequests = group.joinRequests.filter(
      (r: any) => r.userId.toString() !== requestUserId,
    );

    // Add to members
    const alreadyMember = group.members.some(
      (m: any) => m.userId.toString() === requestUserId,
    );
    if (!alreadyMember) {
      group.members.push({
        userId: requestUserId as any,
        role: "member",
        joinedAt: new Date(),
      });
      group.stats.totalMembers = group.members.length;
    }

    await group.save();

    // Get socket IO instance for real-time notifications
    const io = (req.app as any).io as SocketIOServer | null;

    // Get requester user details for notification
    const requesterUser = await User.findById(requestUserId)
      .select("name handle avatarUrl")
      .lean();

    // Notify requester via database notification
    await Notification.create({
      userId: requestUserId,
      type: "group",
      message: `You were approved to join ${group.name}!`,
      read: false,
      relatedId: group._id,
    });

    // Send real-time socket notification to requester
    if (io) {
      sendNotificationToUser(io, requestUserId, {
        type: "group",
        message: `You were approved to join ${group.name}!`,
        groupId: id,
      });

      // Notify all group admins in real-time that request was approved
      const adminIds = group.members
        .filter((m: any) => m.role === "admin")
        .map((m: any) => m.userId.toString());

      if (adminIds.length > 0) {
        io.to(`group:${id}`).emit("group-join-request-approved", {
          groupId: id,
          requestUserId,
          requestUserName:
            requesterUser?.name || requesterUser?.handle || "User",
          approvedBy: adminId,
          timestamp: new Date(),
        });
      }
    }

    logger.info(
      `[approveJoinRequest] User ${requestUserId} approved for group ${id}`,
    );

    res.json({
      success: true,
      data: { message: "User approved", group },
    });
  } catch (error: any) {
    logger.error(`[approveJoinRequest] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/reject/:requestUserId
 * Admin rejects join request
 */
export const rejectJoinRequest = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id, requestUserId } = req.params;
    const adminId = req.userId;

    logger.info(
      `[rejectJoinRequest] Admin ${adminId} rejecting ${requestUserId} for group ${id}`,
    );

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    // Verify user is admin
    const isAdmin = group.members.some(
      (m: any) => m.userId.toString() === adminId && m.role === "admin",
    );
    if (!isAdmin) {
      res.status(403).json({ success: false, error: "Only admin can reject" });
      return;
    }

    // Check if request exists
    const requestExists = group.joinRequests.some(
      (r: any) => r.userId.toString() === requestUserId,
    );
    if (!requestExists) {
      res.status(404).json({ success: false, error: "Join request not found" });
      return;
    }

    // Remove from requests
    group.joinRequests = group.joinRequests.filter(
      (r: any) => r.userId.toString() !== requestUserId,
    );

    await group.save();

    // Get socket IO instance for real-time notifications
    const io = (req.app as any).io as SocketIOServer | null;

    // Get requester user details for notification
    const requesterUser = await User.findById(requestUserId)
      .select("name handle avatarUrl")
      .lean();

    // Notify requester via database notification
    await Notification.create({
      userId: requestUserId,
      type: "group",
      message: `Your request to join ${group.name} was rejected`,
      read: false,
      relatedId: group._id,
    });

    // Send real-time socket notification to requester
    if (io) {
      sendNotificationToUser(io, requestUserId, {
        type: "group",
        message: `Your request to join ${group.name} was rejected`,
        groupId: id,
      });

      // Notify all group admins in real-time that request was rejected
      const adminIds = group.members
        .filter((m: any) => m.role === "admin")
        .map((m: any) => m.userId.toString());

      if (adminIds.length > 0) {
        io.to(`group:${id}`).emit("group-join-request-rejected", {
          groupId: id,
          requestUserId,
          requestUserName:
            requesterUser?.name || requesterUser?.handle || "User",
          rejectedBy: adminId,
          timestamp: new Date(),
        });
      }
    }

    logger.info(
      `[rejectJoinRequest] User ${requestUserId} rejected for group ${id}`,
    );

    res.json({
      success: true,
      data: { message: "User request rejected", group },
    });
  } catch (error: any) {
    logger.error(`[rejectJoinRequest] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/v1/groups/:id/leave
 * Leave a group
 */
export const leaveGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    logger.info(`[leaveGroup] User ${userId} leaving group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    const memberIndex = group.members.findIndex(
      (m: any) => m.userId.toString() === userId,
    );
    if (memberIndex === -1) {
      res.status(400).json({ success: false, error: "Not a member" });
      return;
    }

    // Prevent last admin from leaving
    const isLastAdmin =
      group.members[memberIndex].role === "admin" &&
      group.members.filter((m: any) => m.role === "admin").length === 1;
    if (isLastAdmin) {
      res.status(400).json({
        success: false,
        error: "Cannot leave: you are the only admin",
      });
      return;
    }

    group.members.splice(memberIndex, 1);
    group.stats.totalMembers = group.members.length;

    await group.save();

    logger.info(`[leaveGroup] User ${userId} left group ${id}`);

    res.json({
      success: true,
      data: { message: "Left group" },
    });
  } catch (error: any) {
    logger.error(`[leaveGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups/:id/members
 * Get all group members with pagination
 */
export const getGroupMembers = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 20);
    const skip = (pageNum - 1) * limitNum;

    const group = await Group.findById(id)
      .populate({
        path: "members.userId",
        select: "name avatarUrl verified ridingHours",
        options: { skip, limit: limitNum },
      })
      .lean();

    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    const total = group.members.length;

    res.json({
      success: true,
      data: group.members,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getGroupMembers] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * DELETE /api/v1/groups/:id
 * Delete group (admin only)
 */
export const deleteGroup = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    logger.info(`[deleteGroup] User ${userId} deleting group ${id}`);

    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    const isAdmin = group.members.some(
      (m: any) => m.userId.toString() === userId && m.role === "admin",
    );
    if (!isAdmin) {
      res.status(403).json({ success: false, error: "Only admin can delete" });
      return;
    }

    await Group.findByIdAndDelete(id);

    logger.info(`[deleteGroup] Group ${id} deleted`);

    res.json({
      success: true,
      data: { message: "Group deleted" },
    });
  } catch (error: any) {
    logger.error(`[deleteGroup] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/v1/groups/:id/messages
 * Get group chat message history with pagination
 */
export const getGroupMessages = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    logger.info(`[getGroupMessages] Fetching messages for group ${id}`);

    // Verify group exists and user is member
    const group = await Group.findById(id);
    if (!group) {
      res.status(404).json({ success: false, error: "Group not found" });
      return;
    }

    const isMember = group.members.some(
      (m: any) => m.userId.toString() === userId,
    );
    if (!isMember) {
      res.status(403).json({ success: false, error: "Not a group member" });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, parseInt(limit as string) || 50);
    const skip = (pageNum - 1) * limitNum;

    // Fetch messages
    const messages = await ChatMessage.find({
      groupId: id,
      roomType: "group",
    })
      .populate("senderId", "name avatarUrl")
      .sort({ timestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ChatMessage.countDocuments({
      groupId: id,
      roomType: "group",
    });

    res.json({
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`[getGroupMessages] Error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

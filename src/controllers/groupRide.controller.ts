import { Request, Response } from "express";
import mongoose from "mongoose";
import GroupRide from "../models/groupRide.model.js";
import User from "../models/user.model.js";
import redisClient from "../config/redis.js";
import logger from "../config/logger.js";
import { generateJoinCode } from "../utils/groupRide.js";

// ✅ Match existing AuthRequest pattern
interface AuthRequest extends Request {
  userId: string;
}

// ====================================================================
// HELPER: Auto-end a group ride
// ====================================================================
const autoEndRide = async (rideId: string): Promise<void> => {
  await GroupRide.findByIdAndUpdate(rideId, {
    status: "ended",
    endedAt: new Date(),
  });
  await redisClient.del(`group-ride:${rideId}:locations`);
  logger.info(`[GroupRide] Ride ${rideId} auto-ended`);
};

// ====================================================================
// POST /api/v1/group-ride/create
// Create a new group ride
// ====================================================================
export const createGroupRide = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    // ✅ Check subscription - group rides require Pro tier
    const user = await User.findById(userId).select("subscription");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if subscription is expired
    const isExpired =
      user.subscription.tier === "pro" &&
      user.subscription.expiryDate &&
      new Date() > user.subscription.expiryDate;

    const effectiveTier = isExpired ? "free" : user.subscription.tier;

    if (effectiveTier === "free") {
      return res.status(403).json({
        success: false,
        message: "UPGRADE_REQUIRED",
        error:
          "Group rides are exclusive to Pro members. Upgrade to Pro to ride with friends!",
        data: {
          tier: effectiveTier,
        },
      });
    }

    // Generate a unique join code (retry on collision — extremely rare)
    let joinCode = generateJoinCode();
    let attempts = 0;
    while ((await GroupRide.exists({ joinCode })) && attempts < 5) {
      joinCode = generateJoinCode();
      attempts++;
    }

    const ride = await GroupRide.create({
      creatorId: userId,
      joinCode,
      participants: [{ userId, joinedAt: new Date() }],
      status: "waiting",
    });

    logger.info(
      `[createGroupRide] User ${userId} created group ride ${ride._id} with code ${joinCode}`,
    );

    return res.status(201).json({
      success: true,
      data: {
        rideId: ride._id,
        joinCode: ride.joinCode,
        status: ride.status,
      },
    });
  } catch (error: any) {
    logger.error(`[createGroupRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// POST /api/v1/group-ride/join
// Join a group ride via joinCode
// ====================================================================
export const joinGroupRide = async (req: AuthRequest, res: Response) => {
  try {
    const { joinCode } = req.body;
    const userId = req.userId;

    // ✅ Check subscription - group rides require Pro tier
    const user = await User.findById(userId).select("subscription");
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // Check if subscription is expired
    const isExpired =
      user.subscription.tier === "pro" &&
      user.subscription.expiryDate &&
      new Date() > user.subscription.expiryDate;

    const effectiveTier = isExpired ? "free" : user.subscription.tier;

    if (effectiveTier === "free") {
      return res.status(403).json({
        success: false,
        message: "UPGRADE_REQUIRED",
        error:
          "Group rides are exclusive to Pro members. Upgrade to Pro to ride with friends!",
        data: {
          tier: effectiveTier,
        },
      });
    }

    if (!joinCode) {
      return res
        .status(400)
        .json({ success: false, error: "joinCode is required" });
    }

    const ride = await GroupRide.findOne({
      joinCode: joinCode.toUpperCase().trim(),
    });
    if (!ride) {
      return res
        .status(404)
        .json({ success: false, error: "Ride not found for this join code" });
    }

    if (ride.status === "ended") {
      return res
        .status(400)
        .json({ success: false, error: "This ride has already ended" });
    }

    // Check for duplicate participant
    const alreadyJoined = ride.participants.some(
      (p) => p.userId.toString() === userId,
    );
    if (alreadyJoined) {
      return res.status(200).json({
        success: true,
        data: { rideId: ride._id, message: "Already in this ride" },
      });
    }

    // Add participant
    ride.participants.push({
      userId: new mongoose.Types.ObjectId(userId),
      joinedAt: new Date(),
    });
    await ride.save();

    logger.info(`[joinGroupRide] User ${userId} joined ride ${ride._id}`);

    return res.status(200).json({
      success: true,
      data: { rideId: ride._id, status: ride.status },
    });
  } catch (error: any) {
    logger.error(`[joinGroupRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// POST /api/v1/group-ride/start
// Start the group ride (creator only)
// ====================================================================
export const startGroupRide = async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.body;
    const userId = req.userId;

    if (!rideId) {
      return res
        .status(400)
        .json({ success: false, error: "rideId is required" });
    }

    const ride = await GroupRide.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    if (ride.creatorId.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Only the creator can start the ride" });
    }

    if (ride.status === "active") {
      return res
        .status(400)
        .json({ success: false, error: "Ride is already active" });
    }

    if (ride.status === "ended") {
      return res
        .status(400)
        .json({ success: false, error: "Ride has already ended" });
    }

    ride.status = "active";
    ride.startedAt = new Date();
    await ride.save();

    logger.info(`[startGroupRide] Ride ${rideId} started by user ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        rideId: ride._id,
        status: ride.status,
        startedAt: ride.startedAt,
      },
    });
  } catch (error: any) {
    logger.error(`[startGroupRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// POST /api/v1/group-ride/leave
// Leave a group ride
// If creator leaves → auto end ride
// If last participant leaves → auto end ride
// ====================================================================
export const leaveGroupRide = async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.body;
    const userId = req.userId;

    if (!rideId) {
      return res
        .status(400)
        .json({ success: false, error: "rideId is required" });
    }

    const ride = await GroupRide.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    if (ride.status === "ended") {
      return res
        .status(400)
        .json({ success: false, error: "Ride has already ended" });
    }

    // Check user is in participants
    const isParticipant = ride.participants.some(
      (p) => p.userId.toString() === userId,
    );
    if (!isParticipant) {
      return res
        .status(403)
        .json({ success: false, error: "You are not in this ride" });
    }

    const isCreator = ride.creatorId.toString() === userId;

    // If creator leaves → auto end
    if (isCreator) {
      await autoEndRide(rideId);
      logger.info(
        `[leaveGroupRide] Creator ${userId} left → ride ${rideId} auto-ended`,
      );
      return res.status(200).json({
        success: true,
        data: {
          message:
            "You left the ride. Ride has been ended as you were the creator.",
        },
      });
    }

    // Remove user from participants
    ride.participants = ride.participants.filter(
      (p) => p.userId.toString() !== userId,
    );

    // If last participant left → auto end
    if (ride.participants.length === 0) {
      await autoEndRide(rideId);
      logger.info(
        `[leaveGroupRide] Last participant ${userId} left → ride ${rideId} auto-ended`,
      );
      return res.status(200).json({
        success: true,
        data: {
          message:
            "You left the ride. Ride has been ended as there are no participants left.",
        },
      });
    }

    await ride.save();

    // Remove this user's location from Redis
    await redisClient.hDel(`group-ride:${rideId}:locations`, userId);

    logger.info(`[leaveGroupRide] User ${userId} left ride ${rideId}`);

    return res.status(200).json({
      success: true,
      data: {
        message: "You have left the ride",
        remainingParticipants: ride.participants.length,
      },
    });
  } catch (error: any) {
    logger.error(`[leaveGroupRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// POST /api/v1/group-ride/end
// End the group ride (creator only)
// ====================================================================
export const endGroupRide = async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.body;
    const userId = req.userId;

    if (!rideId) {
      return res
        .status(400)
        .json({ success: false, error: "rideId is required" });
    }

    const ride = await GroupRide.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    if (ride.creatorId.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, error: "Only the creator can end the ride" });
    }

    if (ride.status === "ended") {
      return res
        .status(400)
        .json({ success: false, error: "Ride has already ended" });
    }

    ride.status = "ended";
    ride.endedAt = new Date();
    await ride.save();

    // Delete all live location data from Redis
    await redisClient.del(`group-ride:${rideId}:locations`);

    // Broadcast to all participants in the socket room so their screens
    // auto-navigate back without needing to tap anything.
    const io = (req.app as any).io;
    if (io) {
      io.to(`group-ride:${rideId}`).emit("group-ride-ended", {
        rideId,
        endedAt: ride.endedAt,
        endedBy: userId,
      });
      logger.info(
        `[endGroupRide] Broadcast group-ride-ended to room group-ride:${rideId}`,
      );
    } else {
      logger.warn(`[endGroupRide] io not available — could not broadcast end`);
    }

    logger.info(`[endGroupRide] Ride ${rideId} ended by creator ${userId}`);

    return res.status(200).json({
      success: true,
      data: { rideId: ride._id, status: "ended", endedAt: ride.endedAt },
    });
  } catch (error: any) {
    logger.error(`[endGroupRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// PATCH /api/v1/group-ride/:rideId/stream
// Stream live location during an active group ride
// ====================================================================
export const streamGroupLocation = async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;
    const { lat, lng, speed = 0, accuracy = 10 } = req.body;

    logger.info(
      `[streamGroupLocation] Received from userId:${userId} — rideId:${rideId}, lat:${lat}, lng:${lng}`,
    );

    // Validate coordinates
    if (lat === undefined || lng === undefined) {
      return res
        .status(400)
        .json({ success: false, error: "lat and lng are required" });
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (
      parsedLat < -90 ||
      parsedLat > 90 ||
      parsedLng < -180 ||
      parsedLng > 180
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid coordinates" });
    }

    // Verify ride is active
    const ride = await GroupRide.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    if (ride.status !== "active") {
      return res.status(400).json({
        success: false,
        error: "Location streaming only allowed while ride is active",
      });
    }

    // Verify user is a participant
    const isParticipant = ride.participants.some(
      (p) => p.userId.toString() === userId,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "You are not a participant in this ride",
      });
    }

    // Build location payload
    const locationData = {
      lat: parsedLat,
      lng: parsedLng,
      speed: parseFloat(speed),
      accuracy: parseFloat(accuracy),
      timestamp: Date.now(),
    };

    // Store in Redis HASH: group-ride:{rideId}:locations → field: userId → value: JSON
    const redisKey = `group-ride:${rideId}:locations`;
    await redisClient.hSet(redisKey, userId, JSON.stringify(locationData));
    await redisClient.expire(redisKey, 86400); // 24h TTL

    // Broadcast to all participants in this ride's socket room
    const io = (req.app as any).io;
    if (io) {
      const room = `group-ride:${rideId}`;
      const socketsInRoom = io.sockets.adapter.rooms.get(room);
      const roomSize = socketsInRoom ? socketsInRoom.size : 0;
      logger.info(
        `[streamGroupLocation] Broadcasting to room ${room} (${roomSize} socket(s)) — userId: ${userId}, lat: ${parsedLat}, lng: ${parsedLng}`,
      );
      io.to(room).emit("rider-location", {
        userId,
        ...locationData,
      });
    } else {
      logger.warn(
        `[streamGroupLocation] io not available on req.app — cannot broadcast`,
      );
    }

    logger.info(
      `[streamGroupLocation] ✅ User ${userId} streamed to ride ${rideId} | lat:${parsedLat} lng:${parsedLng} speed:${parseFloat(speed)}`,
    );

    return res.status(200).json({ success: true });
  } catch (error: any) {
    logger.error(`[streamGroupLocation] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// GET /api/v1/group-ride/:rideId/locations
// Get all current live locations for a group ride (participants only)
// ====================================================================
export const getGroupLocations = async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    const ride = await GroupRide.findById(rideId);
    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    // Verify user is a participant
    const isParticipant = ride.participants.some(
      (p) => p.userId.toString() === userId,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "You are not a participant in this ride",
      });
    }

    // Fetch all locations from Redis HASH
    const redisKey = `group-ride:${rideId}:locations`;
    const rawLocations = await redisClient.hGetAll(redisKey);

    // Parse each field
    const locations = Object.entries(rawLocations).map(([uid, raw]) => {
      try {
        const data = JSON.parse(raw);
        return { userId: uid, ...data };
      } catch {
        return { userId: uid, raw };
      }
    });

    logger.debug(
      `[getGroupLocations] Fetched ${locations.length} locations for ride ${rideId}`,
    );

    return res.status(200).json({
      success: true,
      data: {
        rideId,
        status: ride.status,
        locations,
      },
    });
  } catch (error: any) {
    logger.error(`[getGroupLocations] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// ====================================================================
// GET /api/v1/group-ride/:rideId (optional helper)
// Get group ride details
// ====================================================================
export const getGroupRide = async (req: AuthRequest, res: Response) => {
  try {
    const { rideId } = req.params;
    const userId = req.userId;

    const ride = await GroupRide.findById(rideId)
      .populate("creatorId", "name avatarUrl handle")
      .populate("participants.userId", "name avatarUrl handle")
      .lean();

    if (!ride) {
      return res.status(404).json({ success: false, error: "Ride not found" });
    }

    // Verify user is a participant
    const isParticipant = ride.participants.some(
      (p: any) =>
        p.userId?._id?.toString() === userId || p.userId?.toString() === userId,
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        error: "You are not a participant in this ride",
      });
    }

    return res.status(200).json({ success: true, data: ride });
  } catch (error: any) {
    logger.error(`[getGroupRide] Error: ${error.message}`);
    return res.status(500).json({ success: false, error: error.message });
  }
};

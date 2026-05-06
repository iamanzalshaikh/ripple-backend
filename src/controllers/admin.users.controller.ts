import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import User, { IUser } from "../models/user.model.js";
import { recordAuditAction } from "./admin.audit.controller.js";

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with pagination, filtering, and searching
 * @access  Admin
 */
export const getAllUsers = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const verificationStatus = req.query.verificationStatus as string;
    const isSuspended = req.query.isSuspended as string;
    const isCreator = req.query.isCreator as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    const query: any = {};

    // Search logic
    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // Filter logic
    if (verificationStatus) {
      query.verificationStatus = verificationStatus;
    }

    if (isSuspended !== undefined) {
      query.isSuspended = isSuspended === "true";
    }

    if (isCreator !== undefined) {
      query.isCreator = isCreator === "true";
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password -otp -pushTokens") // Exclude sensitive/heavy fields
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    logger.error(`getAllUsers error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get user by ID with all related data
 * @access  Admin
 */
export const getUserById = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Fetch user data
    const user = await User.findById(id).select("-password -otp");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Dynamically import models
    const Bike = (await import("../models/bike.model.js")).default;
    const Ride = (await import("../models/ride.model.js")).default;
    const RideEvent = (await import("../models/rideEvent.model.js")).default;

    // Fetch all related data in parallel
    const [bikes, rides, organizedEvents, participatedEvents] =
      await Promise.all([
        // User's bikes
        Bike.find({ userId: id, status: "active" })
          .select("brand model year cc color imageUrl primary mileage")
          .lean(),

        // Recent rides (last 10)
        Ride.find({ userId: id, status: "completed" })
          .sort({ startedAt: -1 })
          .limit(10)
          .populate("bikeId", "brand model")
          .select(
            "distance duration avgSpeed maxSpeed simplifiedPolyline startedAt endedAt",
          )
          .lean(),

        // Events organized by user
        RideEvent.find({ organizerId: id })
          .sort({ scheduledAt: -1 })
          .limit(5)
          .select("title scheduledAt status participants route")
          .lean(),

        // Events user participated in
        RideEvent.find({ "participants.userId": id })
          .sort({ scheduledAt: -1 })
          .limit(5)
          .select("title scheduledAt status participants route")
          .lean(),
      ]);

    // Calculate aggregate stats
    const totalRides = await Ride.countDocuments({
      userId: id,
      status: "completed",
    });

    const rideStats = await Ride.aggregate([
      { $match: { userId: user._id, status: "completed" } },
      {
        $group: {
          _id: null,
          totalDistance: { $sum: "$distance" },
          totalDuration: { $sum: "$duration" },
          avgSpeed: { $avg: "$avgSpeed" },
          maxSpeed: { $max: "$maxSpeed" },
        },
      },
    ]);

    const stats = rideStats[0] || {
      totalDistance: 0,
      totalDuration: 0,
      avgSpeed: 0,
      maxSpeed: 0,
    };

    // Format response
    const enrichedUser = {
      ...user.toObject(),
      bikes: bikes || [],
      recentRides: rides || [],
      organizedEvents: organizedEvents || [],
      participatedEvents: participatedEvents || [],
      stats: {
        totalRides,
        totalDistance: Math.round(stats.totalDistance), // meters
        totalDistanceKm: Math.round(stats.totalDistance / 1000), // km
        totalDuration: Math.round(stats.totalDuration), // seconds
        totalDurationHours: Math.round((stats.totalDuration / 3600) * 10) / 10, // hours
        avgSpeed: Math.round(stats.avgSpeed * 10) / 10, // km/h
        maxSpeed: Math.round(stats.maxSpeed * 10) / 10, // km/h
      },
    };

    res.status(200).json({
      success: true,
      data: enrichedUser,
    });
  } catch (error: any) {
    logger.error(`getUserById error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/admin/users/:id/suspend
 * @desc    Suspend a user
 * @access  Admin
 */
export const suspendUser = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, until } = req.body;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (user.isSuspended) {
      res.status(400).json({
        success: false,
        message: "User is already suspended",
      });
      return;
    }

    user.isSuspended = true;
    user.suspensionReason = reason || "Violation of terms";
    user.suspendedAt = new Date();
    if (until) {
      user.suspendedUntil = new Date(until);
    }

    await user.save();

    // Record Audit Log
    await recordAuditAction({
      adminId: (req as any).admin._id,
      action: "USER_SUSPENDED",
      targetType: "USER",
      targetId: user._id as any,
      details: `Admin suspended user: ${user.name} (ID: ${user._id}) for: ${user.suspensionReason}`,
      metadata: { reason: user.suspensionReason, until: user.suspendedUntil }
    });

    logger.info(`User suspended by admin: ${id} (Reason: ${reason})`);

    res.status(200).json({
      success: true,
      message: "User suspended successfully",
      data: {
        _id: user._id,
        isSuspended: user.isSuspended,
        suspensionReason: user.suspensionReason,
        suspendedUntil: user.suspendedUntil,
      },
    });
  } catch (error: any) {
    logger.error(`suspendUser error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to suspend user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/admin/users/:id/activate
 * @desc    Activate (unsuspend) a user
 * @access  Admin
 */
export const activateUser = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    if (!user.isSuspended) {
      res.status(400).json({
        success: false,
        message: "User is not suspended",
      });
      return;
    }

    user.isSuspended = false;
    user.suspensionReason = undefined;
    user.suspendedAt = undefined;
    user.suspendedUntil = undefined;

    await user.save();

    // Record Audit Log
    await recordAuditAction({
      adminId: (req as any).admin._id,
      action: "USER_ACTIVATED",
      targetType: "USER",
      targetId: user._id as any,
      details: `Admin activated user: ${user.name} (ID: ${user._id})`,
    });

    logger.info(`User activated by admin: ${id}`);

    res.status(200).json({
      success: true,
      message: "User activated successfully",
      data: {
        _id: user._id,
        isSuspended: user.isSuspended,
      },
    });
  } catch (error: any) {
    logger.error(`activateUser error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to activate user",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

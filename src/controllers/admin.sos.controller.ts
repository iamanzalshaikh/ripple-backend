import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import SOSLog from "../models/soslog.model.js";
import mongoose from "mongoose";

/**
 * Admin SOS Controller
 * Handles SOS log management for admin panel
 */

/**
 * @route   GET /api/admin/sos
 * @desc    Get all SOS logs with pagination and filters
 * @access  Admin
 */
export const getAllSOSLogs = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const status = req.query.status as string;
    const triggerType = req.query.triggerType as string;
    const sortBy = (req.query.sortBy as string) || "triggeredAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;

    // Build match query
    const matchQuery: any = {};

    // Filter by status if provided
    if (status) {
      matchQuery.status = status;
    }

    // Filter by trigger type if provided
    if (triggerType) {
      matchQuery.triggerType = triggerType;
    }

    const skip = (page - 1) * limit;

    // Aggregation pipeline to get SOS logs with user info
    const sosLogs = await SOSLog.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "rides",
          localField: "rideId",
          foreignField: "_id",
          as: "ride",
        },
      },
      {
        $addFields: {
          ride: { $arrayElemAt: ["$ride", 0] },
          alertCount: { $size: "$alerts" },
          locationUpdateCount: { $size: "$locationHistory" },
        },
      },
      {
        $project: {
          _id: 1,
          triggerType: 1,
          triggeredAt: 1,
          resolvedAt: 1,
          status: 1,
          location: 1,
          lastLocationUpdate: 1,
          alertCount: 1,
          locationUpdateCount: 1,
          notes: 1,
          liveShareToken: 1,
          "user._id": 1,
          "user.name": 1,
          "user.email": 1,
          "user.phone": 1,
          "user.avatarUrl": 1,
          "ride._id": 1,
          "ride.distance": 1,
          "ride.duration": 1,
        },
      },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
    ]);

    // Apply search filter if provided (post-aggregation)
    let filteredLogs = sosLogs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = sosLogs.filter(
        (log: any) =>
          log.user?.name?.toLowerCase().includes(searchLower) ||
          log.user?.email?.toLowerCase().includes(searchLower) ||
          log.user?.phone?.includes(search),
      );
    }

    // Get total count for pagination
    const totalCount = await SOSLog.countDocuments(matchQuery);
    const totalPages = Math.ceil(totalCount / limit);

    logger.info(
      `[getAllSOSLogs] Retrieved ${filteredLogs.length} SOS logs (page ${page})`,
    );

    res.status(200).json({
      success: true,
      data: {
        sosLogs: filteredLogs,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
        },
      },
    });
  } catch (error: any) {
    logger.error(`getAllSOSLogs error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SOS logs",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/sos/:id
 * @desc    Get detailed SOS log information
 * @access  Admin
 */
export const getSOSLogDetail = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate sosLogId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid SOS log ID",
      });
      return;
    }

    // Fetch SOS log details with populated references
    const sosLog = await SOSLog.findById(id)
      .populate("userId", "name email phone avatarUrl verified")
      .populate("rideId", "distance duration avgSpeed startedAt endedAt")
      .populate("alerts.contactId", "name email phone")
      .lean();

    if (!sosLog) {
      res.status(404).json({
        success: false,
        message: "SOS log not found",
      });
      return;
    }

    // Calculate duration if resolved
    let duration = null;
    if (sosLog.resolvedAt) {
      duration = Math.floor(
        (new Date(sosLog.resolvedAt).getTime() -
          new Date(sosLog.triggeredAt).getTime()) /
          1000,
      ); // in seconds
    }

    logger.info(`[getSOSLogDetail] Retrieved SOS log details for ${id}`);

    res.status(200).json({
      success: true,
      data: {
        ...sosLog,
        duration,
      },
    });
  } catch (error: any) {
    logger.error(`getSOSLogDetail error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SOS log details",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/admin/sos/:id/resolve
 * @desc    Mark SOS log as resolved
 * @access  Admin
 */
export const resolveSOSLog = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Validate sosLogId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid SOS log ID",
      });
      return;
    }

    const sosLog = await SOSLog.findById(id);

    if (!sosLog) {
      res.status(404).json({
        success: false,
        message: "SOS log not found",
      });
      return;
    }

    if (sosLog.status !== "active") {
      res.status(400).json({
        success: false,
        message: `SOS log is already ${sosLog.status}`,
      });
      return;
    }

    sosLog.status = "resolved";
    sosLog.resolvedAt = new Date();
    if (notes) {
      sosLog.notes = notes;
    }

    await sosLog.save();

    logger.info(`[resolveSOSLog] SOS log ${id} marked as resolved`);

    res.status(200).json({
      success: true,
      message: "SOS log resolved successfully",
      data: sosLog,
    });
  } catch (error: any) {
    logger.error(`resolveSOSLog error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to resolve SOS log",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   PATCH /api/admin/sos/:id/false-positive
 * @desc    Mark SOS log as false positive
 * @access  Admin
 */
export const markFalsePositive = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    // Validate sosLogId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid SOS log ID",
      });
      return;
    }

    const sosLog = await SOSLog.findById(id);

    if (!sosLog) {
      res.status(404).json({
        success: false,
        message: "SOS log not found",
      });
      return;
    }

    sosLog.status = "false_positive";
    sosLog.resolvedAt = new Date();
    if (notes) {
      sosLog.notes = notes;
    }

    await sosLog.save();

    logger.info(`[markFalsePositive] SOS log ${id} marked as false positive`);

    res.status(200).json({
      success: true,
      message: "SOS log marked as false positive",
      data: sosLog,
    });
  } catch (error: any) {
    logger.error(`markFalsePositive error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to mark SOS log as false positive",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * @route   GET /api/admin/sos/stats
 * @desc    Get SOS statistics
 * @access  Admin
 */
export const getSOSStats = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const [
      totalSOS,
      activeSOS,
      resolvedSOS,
      falsePositives,
      manualTriggers,
      crashDetections,
    ] = await Promise.all([
      SOSLog.countDocuments(),
      SOSLog.countDocuments({ status: "active" }),
      SOSLog.countDocuments({ status: "resolved" }),
      SOSLog.countDocuments({ status: "false_positive" }),
      SOSLog.countDocuments({ triggerType: "manual" }),
      SOSLog.countDocuments({ triggerType: "crash_detection" }),
    ]);

    // Get average response time for resolved SOS
    const resolvedLogs = await SOSLog.find({ status: "resolved" }).select(
      "triggeredAt resolvedAt",
    );

    let avgResponseTime = 0;
    if (resolvedLogs.length > 0) {
      const totalResponseTime = resolvedLogs.reduce((sum, log) => {
        if (log.resolvedAt) {
          return (
            sum +
            (new Date(log.resolvedAt).getTime() -
              new Date(log.triggeredAt).getTime())
          );
        }
        return sum;
      }, 0);
      avgResponseTime = Math.floor(
        totalResponseTime / resolvedLogs.length / 1000,
      ); // in seconds
    }

    logger.info(`[getSOSStats] Retrieved SOS statistics`);

    res.status(200).json({
      success: true,
      data: {
        totalSOS,
        activeSOS,
        resolvedSOS,
        falsePositives,
        manualTriggers,
        crashDetections,
        avgResponseTime, // in seconds
      },
    });
  } catch (error: any) {
    logger.error(`getSOSStats error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch SOS statistics",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

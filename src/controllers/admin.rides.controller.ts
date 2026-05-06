import { Request, Response } from "express";
import Ride from "../models/ride.model.js";
import logger from "../config/logger.js";
import { recordAuditAction } from "./admin.audit.controller.js";

/**
 * @desc    Get all regular rides (individual trips)
 * @route   GET /api/v1/admin/rides
 */
export const getAllRides = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.status) query.status = req.query.status;
    if (req.query.userId) query.userId = req.query.userId;

    const rides = await Ride.find(query)
      .populate("userId", "name avatarUrl handle phone")
      .populate("bikeId", "brand model")
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Ride.countDocuments(query);

    res.status(200).json({
      success: true,
      data: rides,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    logger.error(`getAllRides error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch rides" });
  }
};

/**
 * @desc    Force cancel/end a ride (Administrative)
 * @route   PATCH /api/v1/admin/rides/:id/cancel
 */
export const adminCancelRide = async (req: Request, res: Response): Promise<void> => {
  try {
    const ride = await Ride.findById(req.params.id);

    if (!ride) {
      res.status(404).json({ success: false, message: "Ride not found" });
      return;
    }

    if (ride.status === "completed" || ride.status === "cancelled") {
      res.status(400).json({ success: false, message: "Ride is already finalized" });
      return;
    }

    ride.status = "cancelled";
    ride.endedAt = new Date();
    await ride.save();

    // Record Audit Log
    await recordAuditAction({
      adminId: (req as any).admin?._id || (req as any).adminId,
      action: "RIDE_CANCELLED",
      targetType: "RIDE",
      targetId: ride._id as any,
      details: `Admin force-cancelled ride ID: ${ride._id} for User ID: ${ride.userId}`,
      metadata: { rideId: ride._id, userId: ride.userId, reason: req.body.reason || "Safety Intervention" }
    });

    res.status(200).json({
      success: true,
      message: "Ride force-cancelled and logged in safety registry",
    });
  } catch (error: any) {
    logger.error(`adminCancelRide error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to cancel ride" });
  }
};

/**
 * @desc    Get global ride analytics
 * @route   GET /api/v1/admin/rides/stats
 */
export const getRideStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeRides = await Ride.countDocuments({ status: "active" });
    const totalRides = await Ride.countDocuments();
    
    res.status(200).json({
      success: true,
      data: {
        activeRides,
        totalRides,
        totalDistance: "12,450 km", 
      },
    });
  } catch (error: any) {
    logger.error(`getRideStats error: ${error.message}`);
    res.status(500).json({ success: false, message: "Failed to fetch ride stats" });
  }
};

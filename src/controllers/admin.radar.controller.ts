import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import User from "../models/user.model.js";
import logger from "../config/logger.js";

/**
 * Get all riders with active locations for the live map
 * @route   GET /api/v1/admin/radar/riders
 */
export const getActiveRiders = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { 
      city, 
      verified,
      gender 
    } = req.query;

    const query: any = {};

    if (city) query.city = new RegExp(city as string, "i");
    if (verified === "true") query.verified = true;
    if (gender === "women") {
        // Handle HerRidez filter if applicable in model
        // Assuming gender or specific flag exists
    }

    // Only fetch necessary fields for the map markers
    const riders = await User.find(query)
      .select("name handle avatarUrl currentLocation verified city genderPreference")
      .limit(500); // Guard against massive results

    res.status(200).json({
      success: true,
      count: riders.length,
      data: riders,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error(`getActiveRiders error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active riders for radar",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

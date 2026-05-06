import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import Listing from "../models/listing.model.js";
import logger from "../config/logger.js";

/**
 * Get all listings for admin management
 * @route   GET /api/v1/admin/marketplace/listings
 */
export const getAllListings = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category, 
      search 
    } = req.query;

    const query: any = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.title = { $regex: search as string, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate("sellerId", "name phone handle avatarUrl")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: listings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    logger.error(`getAllListings error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update listing status (flag/remove)
 * @route   PATCH /api/v1/admin/marketplace/listings/:id/status
 */
export const updateListingStatus = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["active", "sold", "deleted"].includes(status)) {
       res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
      return;
    }

    const listing = await Listing.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Listing not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: listing,
      message: `Listing status updated to ${status}`,
    });
  } catch (error: any) {
    logger.error(`updateListingStatus error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update listing status",
    });
  }
};

/**
 * Delete listing permanently
 * @route   DELETE /api/v1/admin/marketplace/listings/:id
 */
export const deleteListing = async (
  req: AdminAuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const listing = await Listing.findByIdAndDelete(id);

    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Listing not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Listing permanently deleted",
    });
  } catch (error: any) {
    logger.error(`deleteListing error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
    });
  }
};

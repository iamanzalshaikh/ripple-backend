import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth.types.js";
import Listing from "../models/listing.model.js";
import User from "../models/user.model.js";
import PrivateChatRoom from "../models/private.model.js";
import logger from "../config/logger.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";

/**
 * GET /api/v1/marketplace
 * Browse all active marketplace listings with optional filters
 *
 * Query params:
 * - category: 'gear' | 'bike'
 * - location: string (partial match)
 * - priceMin: number
 * - priceMax: number
 * - search: string (text search on title, description, location)
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 50)
 */
export const browseListings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const {
      category,
      location,
      priceMin,
      priceMax,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    // Build filter query
    const filter: any = { status: "active" };

    if (category) {
      filter.category = category;
    }

    if (location) {
      filter.location = { $regex: location, $options: "i" };
    }

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = Number(priceMin);
      if (priceMax) filter.price.$lte = Number(priceMax);
    }

    if (search) {
      filter.$text = { $search: search as string };
    }

    // Pagination
    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [listings, total] = await Promise.all([
      Listing.find(filter)
        .populate("sellerId", "name verified avatarUrl handle")
        .sort(search ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Listing.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    logger.error(`Error browsing listings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/marketplace/:listingId
 * Get details of a single listing
 */
export const getListingDetails = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { listingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid listing ID",
      });
      return;
    }

    const listing = await Listing.findById(listingId)
      .populate("sellerId", "name verified avatarUrl handle bio city")
      .lean();

    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Listing not found",
      });
      return;
    }

    // Only show active listings to public
    if (listing.status !== "active") {
      res.status(404).json({
        success: false,
        message: "Listing is no longer available",
      });
      return;
    }

    res.json({
      success: true,
      data: listing,
    });
  } catch (error: any) {
    logger.error(`Error fetching listing details: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch listing details",
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/marketplace
 * Create a new marketplace listing
 * Requires: authenticated + verified user
 */
export const createListing = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.userId!;
    const { title, description, price, category, subCategory, location } =
      req.body;

    // Validate required fields
    if (!title || !price || !category) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Title, price, and category are required",
      });
      return;
    }

    // Validate price
    if (price < 0) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Price cannot be negative",
      });
      return;
    }

    // Validate category
    if (!["gear", "bike"].includes(category)) {
      await session.abortTransaction();
      res.status(400).json({
        success: false,
        message: "Category must be either gear or bike",
      });
      return;
    }

    // Handle image uploads
    let mediaUrls: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      if (req.files.length > 5) {
        await session.abortTransaction();
        res.status(400).json({
          success: false,
          message: "Cannot upload more than 5 images",
        });
        return;
      }

      // Upload to Cloudinary
      const uploadPromises = req.files.map((file: any) =>
        uploadOnCloudinary(file.buffer, "marketplace-listings")
      );
      const uploadResults = await Promise.all(uploadPromises);
      mediaUrls = uploadResults.filter((url): url is string => url !== null);
    }

    // Create listing
    const newListing = new Listing({
      sellerId: userId,
      title: title.trim(),
      description: description?.trim(),
      price: Number(price),
      category,
      subCategory: subCategory?.trim(),
      location: location?.trim(),
      media: mediaUrls,
      status: "active",
      verified: false,
    });

    await newListing.save({ session });

    // Add listing to user's listings array
    await User.findByIdAndUpdate(
      userId,
      { $push: { listings: newListing._id } },
      { session }
    );

    await session.commitTransaction();

    // Populate seller info for response
    await newListing.populate("sellerId", "name verified avatarUrl handle");

    logger.info(`Listing created: ${newListing._id} by user ${userId}`);

    res.status(201).json({
      success: true,
      message: "Listing created successfully",
      data: newListing.toJSON(),
    });
  } catch (error: any) {
    await session.abortTransaction();
    logger.error(`Error creating listing: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to create listing",
      error: error.message,
    });
  } finally {
    await session.endSession();
  }
};

/**
 * PATCH /api/v1/marketplace/:listingId
 * Update an existing listing
 * Requires: authenticated + verified user + ownership
 */
export const updateListing = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { listingId } = req.params;
    const {
      title,
      description,
      price,
      category,
      subCategory,
      location,
      status,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid listing ID",
      });
      return;
    }

    // Check ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Listing not found",
      });
      return;
    }

    if (listing.sellerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to update this listing",
      });
      return;
    }

    // Build update object
    const updates: any = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (price !== undefined) {
      if (price < 0) {
        res.status(400).json({
          success: false,
          message: "Price cannot be negative",
        });
        return;
      }
      updates.price = Number(price);
    }
    if (category && ["gear", "bike"].includes(category)) {
      updates.category = category;
    }
    if (subCategory !== undefined) updates.subCategory = subCategory.trim();
    if (location !== undefined) updates.location = location.trim();
    if (status && ["active", "sold"].includes(status)) {
      updates.status = status;
    }

    // Handle new image uploads
    if (req.files && Array.isArray(req.files)) {
      const totalImages = listing.media.length + req.files.length;
      if (totalImages > 5) {
        res.status(400).json({
          success: false,
          message: `Cannot exceed 5 images total. You have ${listing.media.length} existing images.`,
        });
        return;
      }

      const uploadPromises = req.files.map((file: any) =>
        uploadOnCloudinary(file.buffer, "marketplace-listings")
      );
      const uploadResults = await Promise.all(uploadPromises);
      const newMediaUrls = uploadResults.filter(
        (url): url is string => url !== null
      );

      updates.$push = { media: { $each: newMediaUrls } };
    }

    // Update listing
    const updatedListing = await Listing.findByIdAndUpdate(listingId, updates, {
      new: true,
      runValidators: true,
    }).populate("sellerId", "name verified avatarUrl handle");

    logger.info(`Listing updated: ${listingId} by user ${userId}`);

    res.json({
      success: true,
      message: "Listing updated successfully",
      data: updatedListing?.toJSON(),
    });
  } catch (error: any) {
    logger.error(`Error updating listing: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to update listing",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/v1/marketplace/:listingId
 * Soft delete a listing (sets status to 'deleted')
 * Requires: authenticated + ownership
 */
export const deleteListing = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { listingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid listing ID",
      });
      return;
    }

    // Check ownership
    const listing = await Listing.findById(listingId);
    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Listing not found",
      });
      return;
    }

    if (listing.sellerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "You are not authorized to delete this listing",
      });
      return;
    }

    // Soft delete - set status to 'deleted'
    listing.status = "deleted";
    await listing.save();

    logger.info(`Listing soft deleted: ${listingId} by user ${userId}`);

    res.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error: any) {
    logger.error(`Error deleting listing: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/marketplace/:listingId/contact
 * Contact seller - creates/retrieves private chat room
 * Requires: authenticated user
 */
export const contactSeller = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const buyerId = req.userId!;
    const { listingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      res.status(400).json({
        success: false,
        message: "Invalid listing ID",
      });
      return;
    }

    // Verify listing exists and is active
    const listing = await Listing.findById(listingId);
    if (!listing) {
      res.status(404).json({
        success: false,
        message: "Listing not found",
      });
      return;
    }

    if (listing.status !== "active") {
      res.status(400).json({
        success: false,
        message: "This listing is no longer available",
      });
      return;
    }

    const sellerId = listing.sellerId.toString();

    // Prevent seller from contacting themselves
    if (sellerId === buyerId) {
      res.status(400).json({
        success: false,
        message: "You cannot contact yourself",
      });
      return;
    }

    // Generate deterministic room ID (sorted user IDs)
    const roomId = [buyerId, sellerId].sort().join("_");

    // Check if room already exists
    let chatRoom = await PrivateChatRoom.findOne({ roomId })
      .populate("user1", "name avatarUrl verified handle")
      .populate("user2", "name avatarUrl verified handle");

    if (!chatRoom) {
      // Create new private chat room
      chatRoom = new PrivateChatRoom({
        roomId,
        user1: new mongoose.Types.ObjectId([buyerId, sellerId].sort()[0]),
        user2: new mongoose.Types.ObjectId([buyerId, sellerId].sort()[1]),
        context: "marketplace",
        contextId: listing._id,
      });
      await chatRoom.save();

      // Populate after save
      await chatRoom.populate("user1", "name avatarUrl verified handle");
      await chatRoom.populate("user2", "name avatarUrl verified handle");

      logger.info(`New marketplace chat room created: ${roomId}`);
    }

    // TODO: Send notification to seller
    // Notification service integration will be added here

    res.json({
      success: true,
      message: "Chat room ready",
      data: {
        roomId,
        sellerId,
        listingId: listing._id,
        listingTitle: listing.title,
        chatRoom, // Include populated chat room data
      },
    });
  } catch (error: any) {
    logger.error(`Error contacting seller: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to contact seller",
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/marketplace/my-listings
 * Get all listings created by the authenticated user
 * Requires: authenticated + verified user
 */
export const getMyListings = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { status } = req.query;

    const filter: any = { sellerId: userId };

    if (status && ["active", "sold", "deleted"].includes(status as string)) {
      filter.status = status;
    }

    const listings = await Listing.find(filter).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      count: listings.length,
      data: listings,
    });
  } catch (error: any) {
    logger.error(`Error fetching user listings: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your listings",
      error: error.message,
    });
  }
};

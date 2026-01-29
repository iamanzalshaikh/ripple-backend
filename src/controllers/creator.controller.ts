// ==========================================
// File: src/controllers/creator.controller.ts
// Creator Controller
// ==========================================
import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
import User from "../models/user.model.js";
import CreatorApplication from "../models/creatorApplication.model.js";
import logger from "../config/logger.js";
import Notification from "../models/notification.model.js";

/**
 * POST /api/v1/creator/apply
 * Apply to become a creator
 */
export const applyAsCreator = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;
    const {
      creatorHandle,
      city,
      state,
      socialLinks,
      contentCategory,
      avgViews,
      followers,
      proofLinks,
    } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Eligibility check (Step 92)
    // Check profile completion (simplified - you can enhance this)
    const profileFields = [
      { key: "name", value: user.name, label: "Name" },
      { key: "bio", value: user.bio, label: "Bio" },
      { key: "avatarUrl", value: user.avatarUrl, label: "Profile Photo" },
      { key: "city", value: user.city, label: "City" },
      { key: "state", value: user.state, label: "State" },
      { key: "verified", value: user.verified && user.verificationStatus === "approved", label: "Account Verified" },
    ];
    const completedFields = profileFields.filter((field) => !!field.value).length;
    const profileCompletion = (completedFields / profileFields.length) * 100;
    const missingFields = profileFields
      .filter((field) => !field.value)
      .map((field) => field.label);

    if (profileCompletion < 80) {
      res.status(403).json({
        success: false,
        message: "Profile completion must be at least 80%",
        data: {
          profileCompletion: Math.round(profileCompletion),
          missingFields,
          requiredFields: [
            "Name",
            "Bio",
            "Profile Photo",
            "City",
            "State",
            "Account Verified",
          ],
        },
      });
      return;
    }

    if (!user.verified || user.verificationStatus !== "approved") {
      res.status(403).json({
        success: false,
        message: "Account must be verified to become a creator",
      });
      return;
    }

    // Check for existing application
    const existing = await CreatorApplication.findOne({ userId });
    if (existing) {
      res.status(400).json({
        success: false,
        message: "You have already applied. Please wait for review.",
        data: existing,
      });
      return;
    }

    // Validate required fields
    if (!creatorHandle || !contentCategory || contentCategory.length === 0) {
      res.status(400).json({
        success: false,
        message: "Creator handle and content category are required",
      });
      return;
    }

    // Create application
    const application = new CreatorApplication({
      userId,
      creatorHandle: creatorHandle.toLowerCase().trim(),
      city,
      state,
      socialLinks: socialLinks || {},
      contentCategory,
      avgViews,
      followers,
      proofLinks: proofLinks || [],
      status: "pending",
    });

    await application.save();

    logger.info(`Creator application submitted: ${userId} - ${creatorHandle}`);

    // Optional: Notify user that application is pending
    await Notification.create({
      userId: user._id,
      type: "deliverable_submitted", // reuse a generic type; dedicated type can be added later
      creatorApplicationId: application._id,
      message:
        "Your creator application has been submitted. Our team will review it soon.",
      read: false,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully! We'll review and get back to you.",
      data: application,
    });
  } catch (error: any) {
    logger.error(`Error in applyAsCreator: ${error.message}`);
    
    // Handle duplicate key error (creatorHandle)
    if (error.code === 11000) {
      res.status(400).json({
        success: false,
        message: "Creator handle already taken. Please choose another.",
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/creator/status
 * Get creator application status
 */
export const getCreatorStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;

    const application = await CreatorApplication.findOne({ userId })
      .populate("reviewedBy", "name email")
      .lean();

    if (!application) {
      res.json({
        success: true,
        data: {
          status: "not_applied",
          isCreator: false,
        },
      });
      return;
    }

    // Check if user is actually a creator
    const user = await User.findById(userId);
    const isCreator = user?.isCreator || false;

    res.json({
      success: true,
      data: {
        ...application,
        isCreator,
      },
    });
  } catch (error: any) {
    logger.error(`Error in getCreatorStatus: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch creator status",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * GET /api/v1/creator/media-kit
 * Generate media kit PDF (for approved creators only)
 */
export const generateMediaKit = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId!;

    const application = await CreatorApplication.findOne({
      userId,
      status: "approved",
    });

    if (!application) {
      res.status(403).json({
        success: false,
        message: "You are not an approved creator",
      });
      return;
    }

    // If media kit already exists, return it
    if (application.mediaKitUrl) {
      res.json({
        success: true,
        data: {
          mediaKitUrl: application.mediaKitUrl,
        },
      });
      return;
    }

    // TODO: Generate PDF using pdfkit
    // This will be implemented later with PDF generation service
    // For now, return placeholder
    const mediaKitUrl = `https://herridez.com/media-kits/${application._id}.pdf`;

    application.mediaKitUrl = mediaKitUrl;
    await application.save();

    res.json({
      success: true,
      message: "Media kit generated successfully",
      data: {
        mediaKitUrl,
      },
    });
  } catch (error: any) {
    logger.error(`Error in generateMediaKit: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to generate media kit",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};


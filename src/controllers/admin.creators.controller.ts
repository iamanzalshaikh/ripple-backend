// ==========================================
// File: src/controllers/admin.creators.controller.ts
// Admin Creator Applications Controller
// ==========================================
import { Response } from "express";
import { AdminAuthRequest } from "../middlewares/adminAuth.middleware.js";
import logger from "../config/logger.js";
import CreatorApplication from "../models/creatorApplication.model.js";
import User from "../models/user.model.js";
import Notification from "../models/notification.model.js";

/**
 * GET /api/admin/creators/applications
 * List creator applications with optional status filter
 */
export const getCreatorApplications = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const rawStatus = (req.query.status as string) || "";
    // Treat "all" or empty as no status filter
    const status = rawStatus && rawStatus !== "all" ? rawStatus : "";

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      CreatorApplication.find(query)
        .populate("userId", "name email phone handle avatarUrl isCreator")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      CreatorApplication.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error: any) {
    logger.error(`[AdminCreators] getCreatorApplications error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch creator applications",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/admin/creators/applications/:id/approve
 * Approve a creator application and mark user as creator
 */
export const approveCreatorApplication = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const application = await CreatorApplication.findById(id);
    if (!application) {
      res.status(404).json({
        success: false,
        message: "Creator application not found",
      });
      return;
    }

    if (application.status === "approved") {
      res.status(400).json({
        success: false,
        message: "Application is already approved",
      });
      return;
    }

    const user = await User.findById(application.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "Associated user not found",
      });
      return;
    }

    // Update application
    application.status = "approved";
    application.approvedAt = new Date();
    application.reviewedBy = req.adminId as any;
    application.rejectionReason = undefined;
    await application.save();

    // Update user account
    user.isCreator = true;
    user.creatorVerifiedAt = new Date();
    await user.save();

    // Notify user
    await Notification.create({
      userId: user._id,
      type: "creator_application_approved",
      creatorApplicationId: application._id,
      message:
        "Congratulations! Your creator application has been approved. Creator tools are now unlocked in your profile.",
      read: false,
    });

    logger.info(
      `[AdminCreators] Application approved: ${id} by admin ${req.adminId} for user ${user._id}`
    );

    res.status(200).json({
      success: true,
      message: "Creator application approved and user marked as creator",
      data: {
        application,
        user: {
          _id: user._id,
          isCreator: user.isCreator,
          creatorVerifiedAt: user.creatorVerifiedAt,
        },
      },
    });
  } catch (error: any) {
    logger.error(
      `[AdminCreators] approveCreatorApplication error: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: "Failed to approve creator application",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/admin/creators/applications/:id/reject
 * Reject a creator application
 */
export const rejectCreatorApplication = async (
  req: AdminAuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const application = await CreatorApplication.findById(id);
    if (!application) {
      res.status(404).json({
        success: false,
        message: "Creator application not found",
      });
      return;
    }

    if (application.status === "rejected") {
      res.status(400).json({
        success: false,
        message: "Application is already rejected",
      });
      return;
    }

    const user = await User.findById(application.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "Associated user not found",
      });
      return;
    }

    application.status = "rejected";
    application.rejectionReason = reason || "Not a fit for the creator program at this time.";
    application.reviewedBy = req.adminId as any;
    application.approvedAt = undefined;
    await application.save();

    // User remains non-creator (we do not change isCreator here)

    // Notify user
    await Notification.create({
      userId: user._id,
      type: "creator_application_rejected",
      creatorApplicationId: application._id,
      message:
        reason ||
        "Your creator application was not approved at this time. You can improve your profile and apply again later.",
      read: false,
    });

    logger.info(
      `[AdminCreators] Application rejected: ${id} by admin ${req.adminId} for user ${user._id}`
    );

    res.status(200).json({
      success: true,
      message: "Creator application rejected",
      data: application,
    });
  } catch (error: any) {
    logger.error(
      `[AdminCreators] rejectCreatorApplication error: ${error.message}`
    );
    res.status(500).json({
      success: false,
      message: "Failed to reject creator application",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};



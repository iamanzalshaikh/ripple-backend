import { Response, NextFunction } from "express";
import { AuthRequest } from "../types/auth.types.js";
import User from "../models/user.model.js";
import logger from "../config/logger.js";

/**
 * Middleware to verify that the authenticated user is verified
 * This checks both the 'verified' flag and 'verificationStatus' field
 *
 * REQUIREMENTS:
 * - Must be used AFTER isAuth middleware (requires req.userId)
 * - User must have verified: true
 * - User must have verificationStatus: 'approved'
 *
 * USAGE:
 * router.post('/marketplace', isAuth, isVerified, createListing);
 */
const isVerified = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    // Check if userId exists (should be set by isAuth middleware)
    if (!userId) {
      logger.error("isVerified middleware called without authentication");
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    // Fetch user from database
    const user = await User.findById(userId).select(
      "verified verificationStatus name"
    );

    if (!user) {
      logger.error(`User not found: ${userId}`);
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check verification status
    if (!user.verified || user.verificationStatus !== "approved") {
      logger.warn(`Unverified user attempted restricted action: ${userId}`);
      res.status(403).json({
        success: false,
        message:
          "Only verified users can create or manage listings. Please complete your verification to access this feature.",
        verificationStatus: user.verificationStatus,
      });
      return;
    }

    // User is verified, proceed to next middleware/controller
    logger.info(`Verified user access granted: ${userId}`);
    next();
  } catch (error: any) {
    logger.error(`Verification check error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to verify user status",
      error: error.message,
    });
    return;
  }
};

export default isVerified;

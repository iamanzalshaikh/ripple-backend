import { Response, NextFunction } from "express";
import User from "../models/user.model.js";
import logger from "../config/logger.js";
import { AuthRequest } from "../types/auth.types.js";

/**
 * Check if user has Pro subscription
 * Blocks free tier users
 */
export const requirePro = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await User.findById(userId).select("subscription");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if subscription is expired
    const isExpired =
      user.subscription.tier === "pro" &&
      user.subscription.expiryDate &&
      new Date() > user.subscription.expiryDate;

    if (user.subscription.tier !== "pro" || isExpired) {
      res.status(403).json({
        success: false,
        message: "Pro subscription required",
        error: "UPGRADE_REQUIRED",
        data: {
          currentTier: user.subscription.tier,
          isExpired,
        },
      });
      return;
    }

    next();
  } catch (error: any) {
    logger.error(`Subscription middleware error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to check subscription",
      error: error.message,
    });
    return;
  }
};

/**
 * Get user subscription info and attach to request
 * Does not block, just adds subscription info
 */
export const getSubscriptionInfo = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      return next();
    }

    const user = await User.findById(userId).select("subscription");
    if (!user) {
      return next();
    }

    // Check if subscription is expired
    const isExpired =
      user.subscription.tier === "pro" &&
      user.subscription.expiryDate &&
      new Date() > user.subscription.expiryDate;

    // Attach subscription info to request
    (req as any).subscription = {
      tier: isExpired ? "free" : user.subscription.tier,
      isExpired,
      ridesUsedThisMonth: user.subscription.ridesUsedThisMonth,
      expiryDate: user.subscription.expiryDate,
    };

    next();
  } catch (error: any) {
    logger.error(`Get subscription info error: ${error.message}`);
    // Don't block on error, just continue
    next();
  }
};


import { Response } from "express";
import User from "../models/user.model.js";
import SubscriptionPlan from "../models/subscriptionPlan.model.js";
import logger from "../config/logger.js";
import { AuthRequest } from "../types/auth.types.js";

/**
 * GET /api/v1/subscriptions/plans
 * Get all available subscription plans
 */
export const getPlans = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const plans = await SubscriptionPlan.find({ active: true })
      .sort({ tier: 1, duration: 1 })
      .lean();

    res.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    logger.error(`Error fetching plans: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription plans",
      error: error.message,
    });
  }
};

/**
 * GET /api/v1/subscriptions/status
 * Get current user's subscription status
 */
export const getSubscriptionStatus = async (
  req: AuthRequest,
  res: Response
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

    // Get plan details:
    // - If Pro and not expired: use stored planId so we return the exact plan user purchased
    // - If expired or Free: fall back to Free plan definition
    let plan = null;

    const sub: any = user.subscription as any;

    if (!isExpired && sub.tier === "pro" && sub.planId) {
      plan = await SubscriptionPlan.findById(sub.planId).lean();
    }

    if (!plan) {
      // Fallback to Free plan (used when expired or on free tier)
      plan = await SubscriptionPlan.findOne({
        tier: "free",
        active: true,
      })
        .sort({ duration: 1 })
        .lean();
    }

    // Calculate rides limit
    const ridesLimit =
      plan?.features.ridesPerMonth === -1
        ? -1
        : plan?.features.ridesPerMonth || 3;
    const ridesRemaining =
      ridesLimit === -1
        ? -1
        : Math.max(0, ridesLimit - user.subscription.ridesUsedThisMonth);

    res.json({
      success: true,
      data: {
        tier: isExpired ? "free" : user.subscription.tier,
        isExpired,
        startDate: user.subscription.startDate,
        expiryDate: user.subscription.expiryDate,
        ridesUsedThisMonth: user.subscription.ridesUsedThisMonth,
        ridesLimit,
        ridesRemaining,
        lastRideResetDate: user.subscription.lastRideResetDate,
        plan: plan || null,
      },
    });
  } catch (error: any) {
    logger.error(`Error fetching subscription status: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription status",
      error: error.message,
    });
  }
};

/**
 * POST /api/v1/subscriptions/upgrade
 * Upgrade user subscription (demo payment - just click OK)
 */
export const upgradeSubscription = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { planId } = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!planId) {
      res.status(400).json({
        success: false,
        message: "Plan ID is required",
      });
      return;
    }

    // Get plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.active) {
      res.status(404).json({
        success: false,
        message: "Plan not found or inactive",
      });
      return;
    }

    // Only allow upgrading to pro plans
    if (plan.tier === "free") {
      res.status(400).json({
        success: false,
        message: "Cannot upgrade to free plan",
      });
      return;
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Calculate expiry date
    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setMonth(expiryDate.getMonth() + plan.duration);

    // Update user subscription
    user.subscription.tier = "pro";
    user.subscription.startDate = now;
    user.subscription.expiryDate = expiryDate;
    // Store the exact plan the user purchased so status can return correct plan later
    (user.subscription as any).planId = plan._id;
    user.subscription.ridesUsedThisMonth = 0; // Reset ride counter
    user.subscription.lastRideResetDate = now;
    user.subscription.autoRenew = false;
    user.subscription.paymentMethod = null; // Demo payment

    await user.save();

    logger.info(
      `User ${userId} upgraded to ${plan.name} (expires: ${expiryDate.toISOString()})`
    );

    // Get updated subscription status
    const updatedUser = await User.findById(userId).select("subscription");
    const ridesLimit =
      plan.features.ridesPerMonth === -1 ? -1 : plan.features.ridesPerMonth;

    res.json({
      success: true,
      message: "Subscription upgraded successfully",
      data: {
        tier: updatedUser!.subscription.tier,
        startDate: updatedUser!.subscription.startDate,
        expiryDate: updatedUser!.subscription.expiryDate,
        ridesUsedThisMonth: updatedUser!.subscription.ridesUsedThisMonth,
        ridesLimit,
        ridesRemaining: ridesLimit === -1 ? -1 : ridesLimit,
        plan: {
          _id: plan._id,
          name: plan.name,
          tier: plan.tier,
          duration: plan.duration,
          finalPrice: plan.finalPrice,
        },
      },
    });
  } catch (error: any) {
    logger.error(`Error upgrading subscription: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to upgrade subscription",
      error: error.message,
    });
  }
};


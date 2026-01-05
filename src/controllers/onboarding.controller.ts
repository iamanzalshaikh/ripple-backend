import { Response } from "express";
import { AuthRequest } from "../types/auth.types.js";
import User from "../models/user.model.js"
import logger from "../config/logger.js";
import Bike from "../models/bike.model.js";

/**
 * Check onboarding status
 * GET /api/v1/onboarding/status
 */
export const checkOnboardingStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    logger.info(`Checking onboarding status for user ${userId}`);

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const bikeCount = await Bike.countDocuments({ userId, status: "active" });

    const status = {
      completed: user.onboardingCompleted,
      currentStep: user.onboardingStep,
      checks: {
        profileSetup: !!user.name && !!user.avatarUrl,
        bikeAdded: bikeCount > 0,
        emergencyContactAdded:
          user.emergencyContacts && user.emergencyContacts.length > 0,
        verificationApproved: user.verificationStatus === "approved",
        privacySettingsConfirmed: !!user.privacySettings,
      },
      nextAction: null as string | null,
    };

    // Determine next required action
    if (!status.checks.bikeAdded) {
      status.nextAction = "ADD_BIKE";
    } else if (!status.checks.privacySettingsConfirmed) {
      status.nextAction = "CONFIRM_PRIVACY";
    } else if (!status.checks.profileSetup) {
      status.nextAction = "COMPLETE_PROFILE";
    } else if (!status.checks.verificationApproved) {
      status.nextAction = "WAIT_FOR_VERIFICATION";
    } else if (!status.checks.emergencyContactAdded) {
      status.nextAction = "ADD_EMERGENCY_CONTACT";
    } else {
      status.nextAction = "COMPLETE_ONBOARDING";
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    logger.error(`❌ Error checking onboarding: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to check onboarding status",
      error: error.message,
    });
  }
};

/**
 * Complete onboarding
 * PATCH /api/v1/onboarding/complete
 */
export const completeOnboarding = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    logger.info(`Completing onboarding for user ${userId}`);

    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Validation checks
    const bikeCount = await Bike.countDocuments({ userId, status: "active" });

    if (bikeCount === 0) {
      res.status(400).json({
        success: false,
        message: "Please add at least one bike before completing onboarding",
      });
      return;
    }

    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      res.status(400).json({
        success: false,
        message: "Please add at least one emergency contact",
      });
      return;
    }

    if (!user.name || !user.avatarUrl) {
      res.status(400).json({
        success: false,
        message: "Please complete profile setup (name and photo)",
      });
      return;
    }

    if (user.verificationStatus !== "approved") {
      res.status(400).json({
        success: false,
        message: "Rider verification not approved yet",
      });
      return;
    }

    // Mark onboarding complete
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        onboardingCompleted: true,
        onboardingStep: 100,
      },
      { new: true }
    );

    logger.info(`✅ Onboarding completed for user ${userId}`);

    res.json({
      success: true,
      message: "Onboarding completed! Welcome to HerRidez 🏍",
      data: {
        onboardingCompleted: updatedUser?.onboardingCompleted,
        handle: updatedUser?.handle,
        bikes: bikeCount,
      },
    });
  } catch (error: any) {
    logger.error(`❌ Error completing onboarding: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to complete onboarding",
      error: error.message,
    });
  }
};

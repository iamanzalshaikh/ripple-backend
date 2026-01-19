import { Response } from "express";
import User, { IEmergencyContact } from "../models/user.model.js";
import { AuthRequest } from "../types/auth.types.js";
import { uploadOnCloudinary } from "../config/cloudinary.js";
import logger from "../config/logger.js";

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.json({
    success: true,
    data: { user: user.getFullProfile() },
  });
};

/**
 * Get public profile of any user
 * GET /api/v1/profile/:userId
 */
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId: targetUserId } = req.params;
    const currentUserId = req.userId;

    const user = await User.findById(targetUserId)
      .select(
        "name avatarUrl handle bio city state country ridingLevel ridingStyle yearsOfExperience followerCount followingCount totalRides totalDistance verified isCreator createdAt"
      )
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Return public profile data
    return res.json({
      success: true,
      data: { user },
    });
  } catch (error: any) {
    logger.error(`[getUserProfile] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  const allowedFields = [
    "name",
    "bio",
    "city",
    "state",
    "country",
    "ridingLevel",
    "ridingStyle",
    "yearsOfExperience",
    "onboardingCompleted",
  ];

  const updates: any = {};

  for (const key of allowedFields) {
    if (req.body?.[key] !== undefined) {
      if (key === "ridingStyle") {
        // ✅ FORCE ARRAY
        updates[key] = Array.isArray(req.body[key])
          ? req.body[key]
          : [req.body[key]];
      } else if (key === "yearsOfExperience") {
        updates[key] = Number(req.body[key]);
      } else {
        updates[key] = req.body[key];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields provided to update",
    });
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true }
  );

  return res.json({
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
};

/**
 * ✅ GET /api/v1/profile/emergency-contacts
 * Get all emergency contacts for current user
 */
export const getEmergencyContacts = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: {
        contacts: user.emergencyContacts,
        count: user.emergencyContacts.length,
      },
    });
  } catch (error: any) {
    logger.error("Error getting emergency contacts:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ✅ PATCH /api/v1/profile/emergency-contacts/:id
 * Update emergency contact
 * Body: { name?, phone?, email?, relation?, priority? }
 */
export const updateEmergencyContact = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { name, phone, email, relation, priority } = req.body;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const contact = (user.emergencyContacts as any).id(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    // Update fields
    if (name) contact.name = name;
    if (phone) {
      // Validate phone format
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: "Invalid phone number (10 digits required)",
        });
      }
      contact.phone = phone;
    }
    if (email !== undefined) {
      if (email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            message: "Invalid email format",
          });
        }
      }
      contact.email = email;
    }
    if (relation) contact.relation = relation;
    if (priority) contact.priority = priority;

    // Re-sort by priority
    user.emergencyContacts.sort(
      (a: IEmergencyContact, b: IEmergencyContact) => a.priority - b.priority
    );

    await user.save();

    return res.json({
      success: true,
      message: "Contact updated",
      data: { contact },
    });
  } catch (error: any) {
    logger.error("Error updating emergency contact:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ✅ DELETE /api/v1/profile/emergency-contacts/:id
 * Delete emergency contact
 */
export const deleteEmergencyContact = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const contact = (user.emergencyContacts as any).id(id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: "Contact not found",
      });
    }

    contact.deleteOne();
    await user.save();

    return res.json({
      success: true,
      message: "Contact deleted",
      data: { remaining: user.emergencyContacts.length },
    });
  } catch (error: any) {
    logger.error("Error deleting emergency contact:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * ✅ PATCH /api/v1/profile/emergency-contacts/reorder
 * Reorder emergency contacts by priority
 * Body: { contacts: [{ id, priority }, ...] }
 */
export const reorderEmergencyContacts = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { contacts } = req.body;

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid contacts array",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update priorities
    contacts.forEach(({ id, priority }: { id: string; priority: number }) => {
      const contact = (user!.emergencyContacts as any).id(id);
      if (contact) {
        contact.priority = priority;
      }
    });

    // Re-sort
    user.emergencyContacts.sort(
      (a: IEmergencyContact, b: IEmergencyContact) => a.priority - b.priority
    );

    await user.save();

    return res.json({
      success: true,
      message: "Contacts reordered",
      data: { contacts: user.emergencyContacts },
    });
  } catch (error: any) {
    logger.error("Error reordering contacts:", error.message);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

export const updateAvatar = async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "Avatar image required",
    });
  }

  const avatarUrl = await uploadOnCloudinary(
    req.file.buffer,
    "heridez/avatars"
  );

  if (!avatarUrl) {
    return res.status(500).json({
      success: false,
      message: "Avatar upload failed",
    });
  }

  await User.findByIdAndUpdate(req.userId, { avatarUrl });

  return res.json({
    success: true,
    message: "Avatar updated",
    data: { avatarUrl },
  });
};

export const addEmergencyContact = async (req: AuthRequest, res: Response) => {
  const { name, phone, email, relation, priority } = req.body;

  // Validate required fields
  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      message: "Name and phone are required",
    });
  }

  // Validate email format if provided
  if (email && !isValidEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  // Validate phone format
  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      success: false,
      message: "Invalid phone number (10 digits required)",
    });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Create new contact with email
  const newContact = {
    name,
    phone,
    email: email || null,
    relation,
    priority: priority || 1,
    verified: false,
  };

  user.emergencyContacts.push(newContact);
  await user.save();

  // Get the newly added contact with its _id
  const addedContact =
    user.emergencyContacts[user.emergencyContacts.length - 1];

  return res.status(201).json({
    success: true,
    message: "Emergency contact added",
    data: {
      contact: {
        _id: addedContact._id,
        ...(addedContact as any).toObject(),
      },
      emergencyContacts: user.emergencyContacts,
      count: user.emergencyContacts.length,
    },
  });
};

// Helper function to validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const updatePrivacySettings = async (
  req: AuthRequest,
  res: Response
) => {
  const user = await User.findByIdAndUpdate(
    req.userId,
    { privacySettings: req.body },
    { new: true }
  );

  res.json({
    success: true,
    message: "Privacy settings updated",
    data: { privacySettings: user?.privacySettings },
  });
};

/**
 * PATCH /api/v1/profile/push-token
 * Update user's Expo push token for notifications
 */
export const updatePushToken = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { pushToken } = req.body;

    if (!pushToken || typeof pushToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "Valid push token is required",
      });
    }

    // Validate Expo push token format
    if (
      !pushToken.startsWith("ExponentPushToken[") &&
      !pushToken.startsWith("ExpoPushToken[")
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Expo push token format",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Add token if not already present (avoid duplicates)
    if (!user.pushTokens.includes(pushToken)) {
      user.pushTokens.push(pushToken);
      await user.save();

      logger.info(`[updatePushToken] Token registered for user ${req.userId}`);
    } else {
      logger.info(
        `[updatePushToken] Token already exists for user ${req.userId}`
      );
    }

    return res.json({
      success: true,
      message: "Push token registered successfully",
      data: {
        pushToken,
        totalTokens: user.pushTokens.length,
      },
    });
  } catch (error: any) {
    logger.error(`[updatePushToken] Error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

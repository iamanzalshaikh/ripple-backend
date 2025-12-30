import { Response } from "express";
import User from "../models/user.model";
import { AuthRequest } from "../types/auth.types";
import { uploadOnCloudinary } from "../config/cloudinary";

// =================================================
// GET MY PROFILE
// =================================================
export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.json({
    success: true,
    data: { user: user.getFullProfile() },
  });
};

// =================================================
// UPDATE BASIC PROFILE
// =================================================
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
  ];

  const updates: any = {};
  for (const key of allowedFields) {
    if (req.body[key] !== undefined) {
      updates[key] = req.body[key];
    }
  }

  const user = await User.findByIdAndUpdate(
    req.userId,
    { $set: updates },
    { new: true }
  );

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: { user },
  });
};

// =================================================
// UPDATE AVATAR (USING YOUR CLOUDINARY)
// =================================================
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

  res.json({
    success: true,
    message: "Avatar updated",
    data: { avatarUrl },
  });
};

// =================================================
// ADD EMERGENCY CONTACT
// =================================================
export const addEmergencyContact = async (
  req: AuthRequest,
  res: Response
) => {
  const { name, phone, relation, priority } = req.body;

  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      message: "Name and phone are required",
    });
  }

  const user = await User.findById(req.userId);
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  user.emergencyContacts.push({
    name,
    phone,
    relation,
    priority: priority || 1,
    verified: false,
  });

  await user.save();

  res.json({
    success: true,
    message: "Emergency contact added",
    data: { emergencyContacts: user.emergencyContacts },
  });
};

// =================================================
// UPDATE PRIVACY SETTINGS
// =================================================
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

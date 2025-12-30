// ============================================
// File: controllers/authController.ts
// Updated with Separated Types
// ============================================

import { Response } from "express";
// import User from "../models/User.js";
import logger from "../config/logger.js";
// import { sendSignupOtpEmail, sendLoginOtpEmail } from "../utils/emailService.js";
// import {
//   signUserAccessToken,
//   signUserRefreshToken,
//   verifyUserRefreshToken,
// } from "../utils/jwtService.js";
import {
  AuthRequest,
  IAuthResponse,
  IJwtPayload,
  IAuthUser,
  VerificationStatus,
  AccountStatus,
} from "../types/auth.types.js";
import { IApiResponse } from "../types/index.js";
import { UserRole } from "../types/index.js";
import User from "../models/user.model.js";
import { signUserAccessToken, signUserRefreshToken, verifyUserRefreshToken } from "../utils/jwt.js";
import { sendLoginOtpEmail, sendSignupOtpEmail } from "../config/mail.js";



// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Format user response for auth
function formatAuthUser(user: any): IAuthUser {
  return {
    _id: user._id.toString(),
    phone: user.phone,
    email: user.email,
    name: user.name,
    handle: user.handle,
    verified: user.verified,
    verificationStatus: user.verificationStatus,
    accountStatus: user.accountStatus,
    onboardingCompleted: user.onboardingCompleted,
    onboardingStep: user.onboardingStep,
    role: user.role || UserRole.RIDER,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ============================================
// SIGNUP FLOW
// ============================================

/**
 * Step 1: Send OTP to Phone (Signup)
 * POST /api/v1/auth/signup/send-otp
 */
export const sendSignupOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone, email } = req.body;

    // Validation
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
      return;
    }

    // Validate phone format
    if (!/^[0-9]{10}$/.test(phone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Phone number already registered. Please login instead.",
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send OTP via email FIRST (before creating user)
    let emailSent = false;
    if (email) {
      try {
        await sendSignupOtpEmail(email, otp, phone);
        emailSent = true;
        logger.info(`OTP email sent to ${email}`);
      } catch (emailError: any) {
        logger.error(`Failed to send email to ${email}: ${emailError.message}`);
        res.status(500).json({
          success: false,
          message: "Failed to send OTP email. Please check your email address and try again.",
          error: emailError.message,
        });
        return; // Don't create user if email fails
      }
    } else {
      res.status(400).json({
        success: false,
        message: "Email address is required to receive OTP",
      });
      return;
    }

    // ONLY create user AFTER email is sent successfully
    const newUser = new User({
      phone,
      email,
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: VerificationStatus.UNVERIFIED,
      otp: {
        code: otp,
        attempts: 0,
        maxAttempts: 5,
        isUsed: false,
        expiresAt: otpExpiresAt,
      },
    });

    await newUser.save();

    logger.info(`User created: ${phone}, OTP email sent`);

    const response: IApiResponse = {
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        phone,
        email: email,
        otpExpiresIn: "10 minutes",
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Signup OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Step 2: Verify OTP & Create Account (Signup)
 * POST /api/v1/auth/signup/verify-otp
 */
export const verifySignupOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone, otp } = req.body;

    // Validation
    if (!phone || !otp) {
      res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
      return;
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not found. Please signup first.",
      });
      return;
    }

    // Check if OTP already used
    if (user.otp?.isUsed) {
      res.status(400).json({
        success: false,
        message: "This OTP has already been used. Request a new one.",
      });
      return;
    }

    // Check OTP attempts
    if ((user.otp?.attempts || 0) >= (user.otp?.maxAttempts || 5)) {
      res.status(429).json({
        success: false,
        message: "Too many failed attempts. Request a new OTP.",
      });
      return;
    }

    // Check OTP expiry
    if (user.otp?.expiresAt && new Date() > user.otp.expiresAt) {
      res.status(400).json({
        success: false,
        message: "OTP has expired. Request a new one.",
      });
      return;
    }

    // Verify OTP
    if (user.otp?.code !== otp) {
      if (user.otp) {
        user.otp.attempts = (user.otp?.attempts || 0) + 1;
      }
      await user.save();

      res.status(400).json({
        success: false,
        message: `Invalid OTP. ${(user.otp?.maxAttempts || 5) - (user.otp?.attempts || 0)} attempts remaining.`,
      });
      return;
    }

    // OTP is valid - Mark as used
    if (user.otp) {
      user.otp.isUsed = true;
      user.otp.usedAt = new Date();
    }
    user.verified = true;
    user.verificationStatus = VerificationStatus.APPROVED;

    // Generate tokens
    const accessToken = signUserAccessToken(user._id.toString());
    const refreshToken = signUserRefreshToken(user._id.toString());
    

    // Save user
    await user.save();

    logger.info(`User signup successful: ${phone}`);

    const response: IApiResponse<IAuthResponse> = {
      success: true,
      message: "Account created successfully!",
      data: {
        user: formatAuthUser(user),
        accessToken,
        refreshToken,
      },
    };

    res.status(201).json(response);
  } catch (error: any) {
    logger.error(`Verify signup OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "OTP verification failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================
// LOGIN FLOW
// ============================================

/**
 * Step 1: Send OTP to Phone (Login)
 * POST /api/v1/auth/login/send-otp
 */
export const sendLoginOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
      return;
    }

    // Validate phone format
    if (!/^[0-9]{10}$/.test(phone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not found. Please signup first.",
      });
      return;
    }

    // Check if account is suspended
    if (user.isSuspended || user.accountStatus === AccountStatus.SUSPENDED) {
      res.status(403).json({
        success: false,
        message: `Account is suspended. Reason: ${user.suspensionReason || "No reason provided"}`,
      });
      return;
    }

    // Check if account is banned
    if (user.accountStatus === AccountStatus.BANNED) {
      res.status(403).json({
        success: false,
        message: "Account has been permanently banned.",
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with new OTP
    user.otp = {
      code: otp,
      attempts: 0,
      maxAttempts: 5,
      isUsed: false,
      expiresAt: otpExpiresAt,
    };

    await user.save();

    // Send OTP via email if available
    if (user.email) {
      try {
        await sendLoginOtpEmail(user.email, otp, phone);
      } catch (emailError) {
        logger.warn(`Failed to send email to ${user.email}, but OTP saved`);
      }
    }

    // Note: OTP is sent only via email, not logged to console (security best practice)

    const response: IApiResponse = {
      success: true,
      message: "OTP sent successfully",
      data: {
        phone,
        email: user.email || null,
        otpExpiresIn: "10 minutes",
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Login OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Step 2: Verify OTP & Login
 * POST /api/v1/auth/login/verify-otp
 */
export const verifyLoginOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    const clientIP = req.ip || "unknown";

    // Validation
    if (!phone || !otp) {
      res.status(400).json({
        success: false,
        message: "Phone number and OTP are required",
      });
      return;
    }

    // Find user
    const user = await User.findOne({ phone });
    if (!user) {
      res.status(400).json({
        success: false,
        message: "User not found. Please signup first.",
      });
      return;
    }

    // Check if account is suspended
    if (user.isSuspended || user.accountStatus === AccountStatus.SUSPENDED) {
      res.status(403).json({
        success: false,
        message: `Account is suspended. Reason: ${user.suspensionReason || "No reason provided"}`,
      });
      return;
    }

    // Check if account is banned
    if (user.accountStatus === AccountStatus.BANNED) {
      res.status(403).json({
        success: false,
        message: "Account has been permanently banned.",
      });
      return;
    }

    // Check OTP attempts
    if ((user.otp?.attempts || 0) >= (user.otp?.maxAttempts || 5)) {
      res.status(429).json({
        success: false,
        message: "Too many failed attempts. Request a new OTP.",
      });
      return;
    }

    // Check OTP expiry
    if (user.otp?.expiresAt && new Date() > user.otp.expiresAt) {
      res.status(400).json({
        success: false,
        message: "OTP has expired. Request a new one.",
      });
      return;
    }

    // Verify OTP
    if (user.otp?.code !== otp) {
      if (user.otp) {
        user.otp.attempts = (user.otp?.attempts || 0) + 1;
      }
      await user.save();

      res.status(400).json({
        success: false,
        message: `Invalid OTP. ${(user.otp?.maxAttempts || 5) - (user.otp?.attempts || 0)} attempts remaining.`,
      });
      return;
    }

    // OTP is valid - Update user
    if (user.otp) {
      user.otp.isUsed = true;
      user.otp.usedAt = new Date();
    }
    user.lastLoginAt = new Date();
    user.lastLoginIP = clientIP;

    // Generate tokens
    const accessToken = signUserAccessToken(user._id.toString());
    const refreshToken = signUserRefreshToken(user._id.toString());

    // Save user
    await user.save();

    logger.info(`User login successful: ${phone}`);

    const response: IApiResponse<IAuthResponse> = {
      success: true,
      message: "Login successful!",
      data: {
        user: formatAuthUser(user),
        accessToken,
        refreshToken,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Verify login OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Login verification failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================
// REFRESH TOKEN
// ============================================

/**
 * Refresh Access Token
 * POST /api/v1/auth/refresh
 */
export const refreshAccessToken = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyUserRefreshToken(refreshToken) as IJwtPayload;
    if (!decoded) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
      return;
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Check if suspended
    if (
      user.isSuspended ||
      user.accountStatus === AccountStatus.SUSPENDED ||
      user.accountStatus === AccountStatus.BANNED
    ) {
      res.status(403).json({
        success: false,
        message: "Account is suspended or banned",
      });
      return;
    }

    // Generate new access token
    const newAccessToken = signUserAccessToken(user._id.toString());

    const response: IApiResponse = {
      success: true,
      message: "Access token refreshed successfully",
      data: {
        accessToken: newAccessToken,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Refresh token error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Token refresh failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================
// GET CURRENT USER
// ============================================

/**
 * Get Current User Profile
 * GET /api/v1/auth/me
 */
export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const response: IApiResponse = {
      success: true,
      message: "User profile fetched successfully",
      data: {
        user: formatAuthUser(user),
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Get current user error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
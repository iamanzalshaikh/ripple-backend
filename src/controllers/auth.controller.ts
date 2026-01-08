

import { Response } from "express";
import logger from "../config/logger.js";
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
// import { sendLoginOtpEmail, sendSignupOtpEmail } from "../config/mail.js";

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

// In-memory OTP storage (use Redis in production)
const otpStore = new Map<string, { otp: string; expiresAt: number; phone: string }>();

// ============================================
// SIGNUP FLOW - Email & Phone Required
// User created ONLY after OTP verified
// ============================================

/**
 * Step 1: Send OTP to Email (Signup)
 * POST /api/v1/auth/signup/send-otp
 * Body: { email, phone }
 * NOTE: User is NOT created yet, only OTP is sent to email
 */
export const sendSignupOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, phone } = req.body;

    // Validation - Both required
    if (!email || !phone) {
      res.status(400).json({
        success: false,
        message: "Email and phone number are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
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

    // Check if user already exists (by email or phone)
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Email or phone number already registered. Please login instead.",
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Send OTP via email ONLY
    try {
      await sendSignupOtpEmail(email, otp, phone);
      logger.info(`OTP email sent to ${email}`);
    } catch (emailError: any) {
      logger.error(`Failed to send email to ${email}: ${emailError.message}`);
      res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please check your email address and try again.",
        error: emailError.message,
      });
      return;
    }

    // Store OTP in temporary storage (expires in 10 minutes)
    otpStore.set(email, { otp, expiresAt, phone });

    logger.info(`OTP sent to ${email} (${phone}) - User NOT created yet`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        email,
        phone,
        otpExpiresIn: "10 minutes",
      },
    });

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
 * Step 2: Verify OTP & CREATE USER (Signup)
 * POST /api/v1/auth/signup/verify-otp
 * Body: { email, phone, otp }
 * NOTE: User is CREATED ONLY AFTER OTP verification succeeds ✅
 */
export const verifySignupOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, phone, otp } = req.body;

    // Validation - All required
    if (!email || !phone || !otp) {
      res.status(400).json({
        success: false,
        message: "Email, phone number, and OTP are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
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

    // Check if OTP exists in temporary storage
    const storedOtp = otpStore.get(email);
    if (!storedOtp) {
      res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
      return;
    }

    // Check if OTP expired
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(email);
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Check if phone matches
    if (storedOtp.phone !== phone) {
      res.status(400).json({
        success: false,
        message: "Phone number does not match.",
      });
      return;
    }

    // Verify OTP
    if (storedOtp.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
      return;
    }

    // ✅ OTP IS VALID - NOW CREATE USER IN DATABASE
    const newUser = new User({
      email,
      phone,
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: VerificationStatus.APPROVED,
      verified: true,
      otp: {
        code: otp,
        attempts: 0,
        maxAttempts: 5,
        isUsed: true,
        usedAt: new Date(),
        expiresAt: new Date(storedOtp.expiresAt),
      },
    });

    await newUser.save();

    // Remove OTP from temporary storage
    otpStore.delete(email);

    // Generate tokens
    const accessToken = signUserAccessToken(newUser._id.toString());
    const refreshToken = signUserRefreshToken(newUser._id.toString());

    logger.info(`✅ User created successfully: ${email} | ${phone}`);

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      data: {
        user: formatAuthUser(newUser),
        accessToken,
        refreshToken,
      },
    });

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
// LOGIN FLOW - Email Only
// ============================================

/**
 * Step 1: Send OTP to Email (Login)
 * POST /api/v1/auth/login/send-otp
 * Body: { email }
 */
export const sendLoginOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;

    // Validation
    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ email });
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
    const expiresAt = Date.now() + 10 * 60 * 1000;

    // Store OTP in temporary storage
    otpStore.set(email, { otp, expiresAt, phone: user.phone || "" });

    // Send OTP via email only
    try {
      await sendLoginOtpEmail(user.email!, otp, user.phone || "");
      logger.info(`Login OTP email sent to ${user.email}`);
    } catch (emailError) {
      logger.error(`Failed to send login email to ${user.email}`);
      res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        email: user.email,
        otpExpiresIn: "10 minutes",
      },
    });

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
 * Step 2: Verify OTP & Login with Email Only
 * POST /api/v1/auth/login/verify-otp
 * Body: { email, otp }
 */
export const verifyLoginOtp = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body;
    const clientIP = req.ip || "unknown";

    // Validation
    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Find user by email
    const user = await User.findOne({ email });
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

    // Check if OTP exists in temporary storage
    const storedOtp = otpStore.get(email);
    if (!storedOtp) {
      res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
      return;
    }

    // Check if OTP expired
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(email);
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Verify OTP
    if (storedOtp.otp !== otp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
      return;
    }

    // ✅ OTP IS VALID - UPDATE LOGIN INFO
    user.lastLoginAt = new Date();
    user.lastLoginIP = clientIP;

    await user.save();

    // Remove OTP from temporary storage
    otpStore.delete(email);

    // Generate tokens
    const accessToken = signUserAccessToken(user._id.toString());
    const refreshToken = signUserRefreshToken(user._id.toString());

    logger.info(`✅ User login successful: ${email}`);

    res.status(200).json({
      success: true,
      message: "Login successful!",
      data: {
        user: formatAuthUser(user),
        accessToken,
        refreshToken,
      },
    });

  } catch (error: any) {
    logger.error(`Verify login OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Login verification failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// /**
//  * Get Current User Profile
//  * GET /api/v1/auth/me
//  */
// export const getCurrentUser = async (
//   req: AuthRequest,
//   res: Response
// ): Promise<void> => {
//   try {
//     const userId = req.userId;

//     if (!userId) {
//       res.status(401).json({
//         success: false,
//         message: "Unauthorized",
//       });
//       return;
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//       return;
//     }

//     res.status(200).json({
//       success: true,
//       message: "User profile fetched successfully",
//       data: {
//         user: formatAuthUser(user),
//       },
//     });

//   } catch (error: any) {
//     logger.error(`Get current user error: ${error.message}`);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch user profile",
//       error: process.env.NODE_ENV === "development" ? error.message : undefined,
//     });
//   }
// };


// /**
//  * Get Current User Profile
//  * GET /api/v1/auth/me
//  */
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

/**
 * Search users by name, handle, or city
 * Supports pagination and filtering
 */
export const searchUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { query, limit = 20, page = 1, filter = 'all' } = req.query;
    const userId = req.userId;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: "Search query is required",
      });
      return;
    }

    // Trim and validate query
    const searchQuery = query.trim();
    if (searchQuery.length < 2) {
      res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
      return;
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build search filter
    const searchFilter: any = {
      verified: true,
      isSuspended: false,
      verificationStatus: 'approved',
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { handle: { $regex: searchQuery, $options: 'i' } },
        { city: { $regex: searchQuery, $options: 'i' } },
      ],
    };

    // Apply additional filters
    if (filter === 'creators') {
      searchFilter.isCreator = true;
    } else if (filter === 'experts') {
      searchFilter.ridingLevel = 'Expert';
    }

    // Exclude current user
    if (userId) {
      searchFilter._id = { $ne: userId };
    }

    // Execute search with pagination
    const totalUsers = await User.countDocuments(searchFilter);
    const users = await User.find(searchFilter)
      .select(
        'name handle avatarUrl bio city ridingLevel isCreator followerCount totalDistance'
      )
      .limit(limitNum)
      .skip(skip)
      .sort({ followerCount: -1 })
      .lean();

    const totalPages = Math.ceil(totalUsers / limitNum);

    const response: IApiResponse = {
      success: true,
      message: "Users found",
      data: {
        users: users.map(formatUserCard),
        pagination: {
          total: totalUsers,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Search users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to search users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get suggested users based on:
 * - Users you don't follow
 * - Similar riding level and style
 * - Same city/region
 * - High engagement metrics
 */
export const getSuggestedUsers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.userId;
    const { limit = 10 } = req.query;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));

    // Fetch current user
    const currentUser = await User.findById(userId).select(
      'following city ridingLevel ridingStyle'
    );

    if (!currentUser) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    // Build suggestion filter
    const suggestionFilter: any = {
      _id: { $ne: userId },
      verified: true,
      isSuspended: false,
      verificationStatus: 'approved',
      following: { $nin: [userId] }, // Users who don't follow current user
    };

    // Strategy 1: Users with same riding level and style (highest priority)
    const sameStyleUsers = await User.find({
      ...suggestionFilter,
      ridingLevel: currentUser.ridingLevel,
      ridingStyle: { $in: currentUser.ridingStyle },
    })
      .select(
        'name handle avatarUrl bio city ridingLevel isCreator followerCount'
      )
      .limit(Math.ceil(limitNum / 2))
      .sort({ followerCount: -1 })
      .lean();

    // Strategy 2: Users from same city
    let sameCityUsers: any[] = [];
    if (currentUser.city) {
      sameCityUsers = await User.find({
        ...suggestionFilter,
        city: currentUser.city,
        _id: {
          $nin: sameStyleUsers.map((u: any) => u._id),
        },
      })
        .select(
          'name handle avatarUrl bio city ridingLevel isCreator followerCount'
        )
        .limit(Math.ceil(limitNum / 3))
        .sort({ followerCount: -1 })
        .lean();
    }

    // Strategy 3: Popular verified creators
    const popularCreators = await User.find({
      ...suggestionFilter,
      isCreator: true,
      _id: {
        $nin: [
          ...sameStyleUsers.map((u: any) => u._id),
          ...sameCityUsers.map((u: any) => u._id),
        ],
      },
    })
      .select(
        'name handle avatarUrl bio city ridingLevel isCreator followerCount'
      )
      .limit(limitNum - sameStyleUsers.length - sameCityUsers.length)
      .sort({ followerCount: -1 })
      .lean();

    // Combine and shuffle for variety
    const suggestedUsers = [
      ...sameStyleUsers,
      ...sameCityUsers,
      ...popularCreators,
    ]
      .slice(0, limitNum)
      .map(formatUserCard);

    const response: IApiResponse = {
      success: true,
      message: "Suggested users fetched",
      data: {
        users: suggestedUsers,
      },
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error(`Get suggested users error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch suggested users",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get users for display cards
 */
function formatUserCard(user: any) {
  return {
    _id: user._id,
    name: user.name || 'Anonymous',
    handle: user.handle,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    city: user.city,
    ridingLevel: user.ridingLevel,
    isCreator: user.isCreator,
    followerCount: user.followerCount || 0,
    totalDistance: user.totalDistance || 0,
  };
}
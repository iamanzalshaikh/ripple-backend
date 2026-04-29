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
import {
  signUserAccessToken,
  signUserRefreshToken,
  verifyUserRefreshToken,
} from "../utils/jwt.js";
import { sendLoginOtpEmail, sendSignupOtpEmail } from "../config/mail.js";
import {
  sendLoginOtpSms as sendLoginOtpViaSms,
  sendSignupOtpSms as sendSignupOtpViaSms,
} from "../config/sms.js";
import {
  generateOTP,
  hashOTP,
  verifyOTP,
  isOTPExpired,
  calculateOTPExpiry,
} from "../utils/otp.js";
// import { sendLoginOtpEmail, sendSignupOtpEmail } from "../config/mail.js";

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
const otpStore = new Map<
  string,
  { otp: string; expiresAt: number; phone: string; sentAt?: number }
>();

/** Avoid parallel send-otp calls for the same phone (double-tap / Strict Mode). */
const loginOtpSendInFlight = new Set<string>();
const signupOtpSendInFlight = new Set<string>();

const OTP_RESEND_COOLDOWN_MS = Number(
  process.env.OTP_RESEND_COOLDOWN_MS || 45_000,
);

// ============================================
// SIGNUP FLOW - Email & Phone Required
// User created ONLY after OTP verified
// ============================================

/**
 * Step 1: Send OTP to Email (Signup)
 * POST /api/v1/auth/signup/send-otp
 * Body: { email, phone } - email is required, phone is optional
 * NOTE: User is NOT created yet, only OTP is sent to email
 */
export const sendSignupOtp = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { email, phone } = req.body;

    // Validation - Email required
    if (!email) {
      res.status(400).json({
        success: false,
        message: "Email is required",
      });
      return;
    }

    // Normalize email (trim + lowercase) for consistent storage/retrieval
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone ? phone.trim() : "";

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Validate phone format (if provided)
    if (normalizedPhone && !/^[0-9]{10}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
      return;
    }

    // Check if user already exists (by email or phone)
    const queryConditions: Array<{ email?: string; phone?: string }> = [
      { email: normalizedEmail },
    ];
    if (normalizedPhone) {
      queryConditions.push({ phone: normalizedPhone });
    }

    const existingUser = await User.findOne({
      $or: queryConditions,
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message:
          "Email or phone number already registered. Please login instead.",
      });
      return;
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Send OTP via email ONLY
    try {
      await sendSignupOtpEmail(normalizedEmail, otp, normalizedPhone);
      logger.info(`OTP email sent to ${normalizedEmail}`);
    } catch (emailError: any) {
      logger.error(
        `Failed to send email to ${normalizedEmail}: ${emailError.message}`,
      );
      res.status(500).json({
        success: false,
        message:
          "Failed to send OTP email. Please check your email address and try again.",
        error: emailError.message,
      });
      return;
    }

    // Store OTP in temporary storage (expires in 10 minutes) - use normalized email as key
    otpStore.set(normalizedEmail, { otp, expiresAt, phone: normalizedPhone });

    logger.info(`OTP sent to email ${normalizedEmail} - User NOT created yet`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email",
      data: {
        email: normalizedEmail,
        phone: normalizedPhone || null,
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
 * Body: { email, phone, otp } - email and phone are both required, OTP is verified against email
 * NOTE: User is CREATED ONLY AFTER OTP verification succeeds ✅
 */
export const verifySignupOtp = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { email, phone, otp, name } = req.body;

    // Validation - All required for user creation
    if (!phone || !otp) {
      res.status(400).json({
        success: false,
        message: "Email, phone number, and OTP are required",
      });
      return;
    }

    // Normalize email (trim + lowercase) for consistent storage/retrieval
    // const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedOtp = otp.trim();

    // // Validate email format
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(normalizedEmail)) {
    //   res.status(400).json({
    //     success: false,
    //     message: "Invalid email format",
    //   });
    //   return;
    // }

    // // Validate phone format
    // if (!/^[0-9]{10}$/.test(normalizedPhone)) {
    //   res.status(400).json({
    //     success: false,
    //     message: "Phone number must be 10 digits",
    //   });
    //   return;
    // }

    // Check if OTP exists in temporary storage - use normalized email as key
    const storedOtp = otpStore.get(normalizedPhone);
    if (!storedOtp) {
      res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
      return;
    }

    // Check if OTP expired
    if (Date.now() > storedOtp.expiresAt) {
      otpStore.delete(normalizedPhone);
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Verify OTP (compare normalized OTP)
    if (storedOtp.otp !== normalizedOtp) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
      return;
    }

    // ✅ OTP IS VALID - NOW CREATE USER IN DATABASE
    const newUser = new User({
      // email: normalizedEmail,
      phone: normalizedPhone,
      name: name ? name.trim() : undefined,
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: VerificationStatus.APPROVED,
      verified: true,
      otp: {
        code: normalizedOtp,
        attempts: 0,
        maxAttempts: 5,
        isUsed: true,
        usedAt: new Date(),
        expiresAt: new Date(storedOtp.expiresAt),
      },
    });

    await newUser.save();

    // Remove OTP from temporary storage
    otpStore.delete(normalizedPhone);

    // Generate tokens
    const accessToken = signUserAccessToken(newUser._id.toString());
    const refreshToken = signUserRefreshToken(newUser._id.toString());

    logger.info(`✅ User created successfully: ${normalizedPhone}`);

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
  res: Response,
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
  res: Response,
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

// ============================================
// SMS-BASED SIGNUP FLOW (Phone + Email Required)
// OTP sent via SMS to phone number
// ============================================

/**
 * Step 1: Send OTP to Phone via SMS (Signup)
 * POST /api/v1/auth/signup/send-otp-sms
 * Body: { email, phone }
 * NOTE: User is NOT created yet, only OTP is sent to phone via SMS
 */
export const sendSignupOtpSms = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Check if request body exists
    if (!req.body) {
      res.status(400).json({
        success: false,
        message:
          "Request body is required. Please ensure Content-Type is application/json",
      });
      return;
    }

    const { email, phone } = req.body;

    // Validation - Both required
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "Email and phone number are required",
      });
      return;
    }

    // // Normalize email and phone
    // const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();

    // // Validate email format
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(normalizedEmail)) {
    //   res.status(400).json({
    //     success: false,
    //     message: "Invalid email format",
    //   });
    //   return;
    // }

    // Validate phone format (10 digits)
    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
      return;
    }

    // Check if user already exists (by email or phone)
    const existingUser = await User.findOne({
      phone: normalizedPhone,
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "Phone number already registered. Please login instead.",
      });
      return;
    }

    if (signupOtpSendInFlight.has(normalizedPhone)) {
      logger.info(
        `[SMS] Signup OTP: send already in progress for ${normalizedPhone} (idempotent OK)`,
      );
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to your phone via SMS",
        data: {
          phone: normalizedPhone,
          otpExpiresIn: "10 minutes",
        },
      });
      return;
    }

    const existingSignupOtp = otpStore.get(normalizedPhone);
    if (
      existingSignupOtp &&
      !isOTPExpired(new Date(existingSignupOtp.expiresAt)) &&
      existingSignupOtp.sentAt != null &&
      Date.now() - existingSignupOtp.sentAt < OTP_RESEND_COOLDOWN_MS
    ) {
      logger.info(
        `[SMS] Signup OTP: resend within cooldown for ${normalizedPhone} — keeping current OTP`,
      );
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to your phone via SMS",
        data: {
          phone: normalizedPhone,
          otpExpiresIn: "10 minutes",
        },
      });
      return;
    }

    signupOtpSendInFlight.add(normalizedPhone);
    try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = calculateOTPExpiry(10); // 10 minutes

    // Hash OTP before storing
    const otpHash = await hashOTP(otp);

    // Send OTP via SMS (with fallback: Techmore → Twilio)
    try {
      const smsSent = await sendSignupOtpViaSms(normalizedPhone, otp);
      if (!smsSent) {
        res.status(500).json({
          success: false,
          message:
            "Failed to send OTP via SMS. Please check your phone number and try again.",
        });
        return;
      }
      logger.info(`[SMS] OTP sent to ${normalizedPhone}`);
    } catch (smsError: any) {
      logger.error(
        `[SMS] Failed to send SMS to ${normalizedPhone}: ${smsError.message}`,
      );
      res.status(500).json({
        success: false,
        message:
          "Failed to send OTP via SMS. Please check your phone number and try again.",
        error: smsError.message,
      });
      return;
    }

    // Store hashed OTP in temporary storage (expires in 10 minutes)
    otpStore.set(normalizedPhone, {
      otp: otpHash,
      expiresAt,
      phone: normalizedPhone,
      sentAt: Date.now(),
    });

    logger.info(`[SMS] OTP sent to ${normalizedPhone} - User NOT created yet`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your phone via SMS",
      data: {
        phone: normalizedPhone,
        otpExpiresIn: "10 minutes",
        // Local/QA only: set DEV_OTP_ECHO=true so Postman can read OTP without SMS.
        ...(process.env.DEV_OTP_ECHO === "true" ? { devOtp: otp } : {}),
      },
    });
    } finally {
      signupOtpSendInFlight.delete(normalizedPhone);
    }
  } catch (error: any) {
    logger.error(`[SMS] Signup OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Step 2: Verify OTP & CREATE USER (Signup with SMS)
 * POST /api/v1/auth/signup/verify-otp-sms
 * Body: { email, phone, otp }
 * NOTE: User is CREATED ONLY AFTER OTP verification succeeds ✅
 */
export const verifySignupOtpSms = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Check if request body exists
    if (!req.body) {
      res.status(400).json({
        success: false,
        message:
          "Request body is required. Please ensure Content-Type is application/json",
      });
      return;
    }

    const { email, phone, otp, name } = req.body;

    // Validation - All required
    if (!phone || !otp) {
      res.status(400).json({
        success: false,
        message: "Email, phone number, and OTP are required",
      });
      return;
    }

    // Normalize inputs
    // const normalizedEmail = email.trim().toLowerCase();
    const normalizedPhone = phone.trim();
    const normalizedOtp = otp.trim();

    // Validate email format
    // const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // if (!emailRegex.test(normalizedEmail)) {
    //   res.status(400).json({
    //     success: false,
    //     message: "Invalid email format",
    //   });
    //   return;
    // }

    // Validate phone format
    // if (!/^[0-9]{10}$/.test(normalizedPhone)) {
    //   res.status(400).json({
    //     success: false,
    //     message: "Phone number must be 10 digits",
    //   });
    //   return;
    // }

    // Check if OTP exists in temporary storage
    const storedOtp = otpStore.get(normalizedPhone);
    if (!storedOtp) {
      res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
      return;
    }

    // Check if OTP expired
    if (isOTPExpired(new Date(storedOtp.expiresAt))) {
      otpStore.delete(normalizedPhone);
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Verify OTP hash
    const isValidOTP = await verifyOTP(normalizedOtp, storedOtp.otp);
    if (!isValidOTP) {
      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
      return;
    }

    // ✅ OTP IS VALID - NOW CREATE USER IN DATABASE
    const newUser = new User({
      // email: normalizedEmail,
      phone: normalizedPhone,
      name: name ? name.trim() : undefined,
      role: UserRole.RIDER,
      accountStatus: AccountStatus.ACTIVE,
      verificationStatus: VerificationStatus.APPROVED,
      verified: true,
      otp: {
        code: storedOtp.otp, // Store hashed OTP
        attempts: 0,
        maxAttempts: 5,
        isUsed: true,
        usedAt: new Date(),
        expiresAt: new Date(storedOtp.expiresAt),
      },
    });

    await newUser.save();

    // Remove OTP from temporary storage
    otpStore.delete(normalizedPhone);

    // Generate tokens
    const accessToken = signUserAccessToken(newUser._id.toString());
    const refreshToken = signUserRefreshToken(newUser._id.toString());

    logger.info(`✅ User created successfully via SMS: ${normalizedPhone}`);

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
    logger.error(`[SMS] Verify signup OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "OTP verification failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================
// SMS-BASED LOGIN FLOW (Phone Only)
// OTP sent via SMS to phone number
// ============================================

/**
 * Step 1: Send OTP to Phone via SMS (Login)
 * POST /api/v1/auth/login/send-otp-sms
 * Body: { phone }
 */
export const sendLoginOtpSms = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Check if request body exists
    if (!req.body) {
      res.status(400).json({
        success: false,
        message:
          "Request body is required. Please ensure Content-Type is application/json",
      });
      return;
    }

    const { phone } = req.body;

    // Validation
    if (!phone) {
      res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
      return;
    }

    // Normalize phone
    const normalizedPhone = phone.trim();

    // Validate phone format (10 digits)
    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
      return;
    }

    // Check if user exists
    const user = await User.findOne({ phone: normalizedPhone });
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

    // Only one OTP per phone should be “live”: overlapping sends overwrite otpStore and
    // the SMS the user reads may not match what the server last stored.
    if (loginOtpSendInFlight.has(normalizedPhone)) {
      logger.info(
        `[SMS] Login OTP: send already in progress for ${normalizedPhone} (idempotent OK)`,
      );
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to your phone via SMS",
        data: {
          phone: normalizedPhone,
          otpExpiresIn: "10 minutes",
        },
      });
      return;
    }

    const existingLoginOtp = otpStore.get(normalizedPhone);
    if (
      existingLoginOtp &&
      !isOTPExpired(new Date(existingLoginOtp.expiresAt)) &&
      existingLoginOtp.sentAt != null &&
      Date.now() - existingLoginOtp.sentAt < OTP_RESEND_COOLDOWN_MS
    ) {
      logger.info(
        `[SMS] Login OTP: resend within cooldown for ${normalizedPhone} — keeping current OTP`,
      );
      res.status(200).json({
        success: true,
        message: "OTP sent successfully to your phone via SMS",
        data: {
          phone: normalizedPhone,
          otpExpiresIn: "10 minutes",
        },
      });
      return;
    }

    loginOtpSendInFlight.add(normalizedPhone);
    try {
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = calculateOTPExpiry(10); // 10 minutes

    // Hash OTP before storing
    let otpHash: string;
    try {
      otpHash = await hashOTP(otp);
    } catch (hashError: any) {
      logger.error(
        `[SMS] Failed to hash OTP: ${hashError?.message || "Unknown error"}`,
      );
      res.status(500).json({
        success: false,
        message: "Failed to process OTP. Please try again.",
      });
      return;
    }

    // Store hashed OTP in temporary storage
    otpStore.set(normalizedPhone, {
      otp: otpHash,
      expiresAt,
      phone: normalizedPhone,
      sentAt: Date.now(),
    });

    // Send OTP via SMS (with fallback: Techmore → Twilio)
    try {
      const smsSent = await sendLoginOtpViaSms(normalizedPhone, otp);
      if (!smsSent) {
        logger.error(`[SMS] SMS service returned false for ${normalizedPhone}`);
        res.status(500).json({
          success: false,
          message: "Failed to send OTP via SMS. Please try again.",
        });
        return;
      }
      logger.info(`[SMS] Login OTP sent to ${normalizedPhone}`);
    } catch (smsError: any) {
      logger.error(
        `[SMS] Exception caught while sending login SMS to ${normalizedPhone}`,
      );
      logger.error(`[SMS] Error type: ${typeof smsError}`);
      logger.error(`[SMS] Error message: ${smsError?.message || "No message"}`);
      logger.error(`[SMS] Error stack: ${smsError?.stack || "No stack"}`);
      res.status(500).json({
        success: false,
        message: "Failed to send OTP via SMS. Please try again.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your phone via SMS",
      data: {
        phone: normalizedPhone,
        otpExpiresIn: "10 minutes",
      },
    });
    } finally {
      loginOtpSendInFlight.delete(normalizedPhone);
    }
  } catch (error: any) {
    logger.error(
      `[SMS] Login OTP error in outer catch: ${error?.message || "Unknown error"}`,
    );
    logger.error(`[SMS] Error type: ${typeof error}`);
    logger.error(`[SMS] Error stack: ${error?.stack || "No stack"}`);
    logger.error(
      `[SMS] Full error object: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}`,
    );

    // Ensure res is available before using it
    if (res && typeof res.status === "function") {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
        error:
          process.env.NODE_ENV === "development" ? error?.message : undefined,
      });
    } else {
      logger.error(
        `[SMS] CRITICAL: res object is not available or res.status is not a function`,
      );
    }
  }
};

/**
 * Step 2: Verify OTP & Login with Phone via SMS
 * POST /api/v1/auth/login/verify-otp-sms
 * Body: { phone, otp }
 */
export const verifyLoginOtpSms = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    // Check if request body exists
    if (!req.body) {
      res.status(400).json({
        success: false,
        message:
          "Request body is required. Please ensure Content-Type is application/json",
      });
      return;
    }

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

    // Normalize inputs
    const normalizedPhone = phone.trim();
    const normalizedOtp = otp.trim();

    // Validate phone format
    if (!/^[0-9]{10}$/.test(normalizedPhone)) {
      res.status(400).json({
        success: false,
        message: "Phone number must be 10 digits",
      });
      return;
    }

    // Find user by phone
    const user = await User.findOne({ phone: normalizedPhone });
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
    const storedOtp = otpStore.get(normalizedPhone);
    if (!storedOtp) {
      res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
      return;
    }

    // Check if OTP expired
    if (isOTPExpired(new Date(storedOtp.expiresAt))) {
      otpStore.delete(normalizedPhone);
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    // Verify OTP hash
    const isValidOTP = await verifyOTP(normalizedOtp, storedOtp.otp);
    if (!isValidOTP) {
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
    otpStore.delete(normalizedPhone);

    // Generate tokens
    const accessToken = signUserAccessToken(user._id.toString());
    const refreshToken = signUserRefreshToken(user._id.toString());

    logger.info(`✅ User login successful via SMS: ${normalizedPhone}`);

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
    logger.error(`[SMS] Verify login OTP error: ${error.message}`);
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
  res: Response,
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
 * Logout User
 * POST /api/v1/auth/logout
 * Updates lastLogoutAt timestamp
 */
export const logout = async (
  req: AuthRequest,
  res: Response,
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

    // Update user's last logout timestamp
    await User.findByIdAndUpdate(userId, {
      lastLogoutAt: new Date(),
    });

    logger.info(`✅ User logged out: ${userId}`);

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    logger.error(`Logout error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Logout failed",
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
  res: Response,
): Promise<void> => {
  try {
    const { query, limit = 20, page = 1, filter = "all" } = req.query;
    const userId = req.userId;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
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
      verificationStatus: "approved",
      $or: [
        { name: { $regex: searchQuery, $options: "i" } },
        { handle: { $regex: searchQuery, $options: "i" } },
        { city: { $regex: searchQuery, $options: "i" } },
      ],
    };

    // Apply additional filters
    if (filter === "creators") {
      searchFilter.isCreator = true;
    } else if (filter === "experts") {
      searchFilter.ridingLevel = "Expert";
    }

    // Exclude current user
    if (userId) {
      searchFilter._id = { $ne: userId };
    }

    // Execute search with pagination
    const totalUsers = await User.countDocuments(searchFilter);
    const users = await User.find(searchFilter)
      .select(
        "name handle avatarUrl bio city ridingLevel isCreator followerCount totalDistance",
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
  res: Response,
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
      "following city ridingLevel ridingStyle",
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
      verificationStatus: "approved",
      following: { $nin: [userId] }, // Users who don't follow current user
    };

    // Strategy 1: Users with same riding level and style (highest priority)
    const sameStyleUsers = await User.find({
      ...suggestionFilter,
      ridingLevel: currentUser.ridingLevel,
      ridingStyle: { $in: currentUser.ridingStyle },
    })
      .select(
        "name handle avatarUrl bio city ridingLevel isCreator followerCount",
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
          "name handle avatarUrl bio city ridingLevel isCreator followerCount",
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
        "name handle avatarUrl bio city ridingLevel isCreator followerCount",
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
    name: user.name || "Anonymous",
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

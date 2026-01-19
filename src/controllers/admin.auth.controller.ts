import { Request, Response } from "express";
import logger from "../config/logger.js";
import AdminUser, {
  AdminAccountStatus,
  AdminRole,
} from "../models/adminUser.model.js";
import {
  signAdminAccessToken,
  signAdminRefreshToken,
} from "../utils/jwtAdmin.js";
import redisClient from "../config/redis.js";
import { sendLoginOtpEmail } from "../config/mail.js";

const ADMIN_LOGIN_OTP_TTL_SECONDS = 10 * 60; // 10 minutes
const ADMIN_LOGIN_MAX_OTP_ATTEMPTS = 5;
const ADMIN_MAX_PASSWORD_ATTEMPTS = 5;
const ADMIN_LOCKOUT_MINUTES = 15;

interface AdminLoginOtpData {
  otp: string;
  attempts: number;
  expiresAt: number;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function getAdminOtpKey(email: string): string {
  return `admin:login_otp:${email.toLowerCase()}`;
}

async function setLoginOtp(email: string, otp: string): Promise<void> {
  const data: AdminLoginOtpData = {
    otp,
    attempts: 0,
    expiresAt: Date.now() + ADMIN_LOGIN_OTP_TTL_SECONDS * 1000,
  };
  await redisClient.set(getAdminOtpKey(email), JSON.stringify(data), {
    EX: ADMIN_LOGIN_OTP_TTL_SECONDS,
  });
}

async function getLoginOtp(email: string): Promise<AdminLoginOtpData | null> {
  const raw = await redisClient.get(getAdminOtpKey(email));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AdminLoginOtpData;
  } catch {
    return null;
  }
}

async function incrementOtpAttempts(email: string): Promise<AdminLoginOtpData | null> {
  const key = getAdminOtpKey(email);
  const raw = await redisClient.get(key);
  if (!raw) return null;
  let data: AdminLoginOtpData;
  try {
    data = JSON.parse(raw) as AdminLoginOtpData;
  } catch {
    return null;
  }
  data.attempts += 1;
  await redisClient.set(key, JSON.stringify(data), {
    EX: ADMIN_LOGIN_OTP_TTL_SECONDS,
  });
  return data;
}

async function clearLoginOtp(email: string): Promise<void> {
  await redisClient.del(getAdminOtpKey(email));
}

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role } = req.body as {
      name?: string;
      email?: string;
      password?: string;
      role?: AdminRole;
    };

    if (!name || !email || !password) {
      res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
      return;
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existing) {
      res.status(400).json({
        success: false,
        message: "Admin with this email already exists",
      });
      return;
    }

    const admin = new AdminUser({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || AdminRole.ADMIN,
      status: AdminAccountStatus.ACTIVE,
    });

    await admin.save();

    logger.info(`✅ Admin registered: ${admin.email} (${admin.role})`);

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: {
        admin: admin.toJSON(),
      },
    });
  } catch (error: any) {
    logger.error(`Register admin error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to register admin",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };
    const clientIP = req.ip || "unknown";

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      res.status(400).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    if (admin.status === AdminAccountStatus.SUSPENDED) {
      res.status(403).json({
        success: false,
        message: "Admin account is suspended",
      });
      return;
    }
    if (admin.status === AdminAccountStatus.BANNED) {
      res.status(403).json({
        success: false,
        message: "Admin account has been permanently banned",
      });
      return;
    }

    if (admin.isLocked && admin.lockedUntil && admin.lockedUntil > new Date()) {
      res.status(423).json({
        success: false,
        message: "Account is temporarily locked due to multiple failed attempts",
      });
      return;
    }

    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      admin.failedLoginAttempts += 1;
      admin.lastFailedLoginAt = new Date();

      if (admin.failedLoginAttempts >= ADMIN_MAX_PASSWORD_ATTEMPTS) {
        admin.isLocked = true;
        admin.lockedUntil = new Date(
          Date.now() + ADMIN_LOCKOUT_MINUTES * 60 * 1000
        );
      }

      await admin.save();

      res.status(400).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    admin.failedLoginAttempts = 0;
    admin.isLocked = false;
    admin.lockedUntil = undefined;
    await admin.save();

    const otp = generateOtp();
    await setLoginOtp(admin.email, otp);

    try {
      await sendLoginOtpEmail(admin.email, otp, "");
      logger.info(`Admin login OTP email sent to ${admin.email}`);
    } catch (emailError: any) {
      logger.error(
        `Failed to send admin login OTP email to ${admin.email}: ${emailError.message}`
      );
      res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
      return;
    }

    logger.info(`Admin login OTP generated for ${admin.email} from IP ${clientIP}`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to admin email",
      data: {
        email: admin.email,
        otpExpiresIn: `${ADMIN_LOGIN_OTP_TTL_SECONDS / 60} minutes`,
      },
    });
  } catch (error: any) {
    logger.error(`Admin login error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to initiate admin login",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const verifyAdminLoginOtp = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body as { email?: string; otp?: string };
    const clientIP = req.ip || "unknown";

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    const admin = await AdminUser.findOne({ email: email.toLowerCase() });
    if (!admin) {
      res.status(400).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    if (admin.status === AdminAccountStatus.SUSPENDED) {
      res.status(403).json({
        success: false,
        message: "Admin account is suspended",
      });
      return;
    }
    if (admin.status === AdminAccountStatus.BANNED) {
      res.status(403).json({
        success: false,
        message: "Admin account has been permanently banned",
      });
      return;
    }

    const otpData = await getLoginOtp(admin.email);
    if (!otpData) {
      res.status(400).json({
        success: false,
        message: "OTP not found or expired. Please request a new OTP.",
      });
      return;
    }

    if (Date.now() > otpData.expiresAt) {
      await clearLoginOtp(admin.email);
      res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
      return;
    }

    if (otpData.attempts >= ADMIN_LOGIN_MAX_OTP_ATTEMPTS) {
      await clearLoginOtp(admin.email);
      res.status(423).json({
        success: false,
        message: "Too many invalid OTP attempts. Please restart login.",
      });
      return;
    }

    if (otpData.otp !== otp) {
      const updated = await incrementOtpAttempts(admin.email);
      const remaining =
        updated && updated.attempts <= ADMIN_LOGIN_MAX_OTP_ATTEMPTS
          ? ADMIN_LOGIN_MAX_OTP_ATTEMPTS - updated.attempts
          : 0;

      res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
        data: {
          remainingAttempts: remaining,
        },
      });
      return;
    }

    await clearLoginOtp(admin.email);

    await admin.recordLogin(clientIP);

    const accessToken = signAdminAccessToken(admin._id.toString(), admin.role);
    const refreshToken = signAdminRefreshToken(admin._id.toString(), admin.role);

    logger.info(`✅ Admin login successful: ${admin.email}`);

    res.status(200).json({
      success: true,
      message: "Admin login successful",
      data: {
        admin: admin.toJSON(),
        accessToken,
        refreshToken,
      },
    });
  } catch (error: any) {
    logger.error(`Verify admin login OTP error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Admin login verification failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const getCurrentAdmin = async (
  req: Request & { adminId?: string },
  res: Response
): Promise<void> => {
  try {
    const adminId = req.adminId;

    if (!adminId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    const admin = await AdminUser.findById(adminId);
    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admin profile fetched successfully",
      data: {
        admin: admin.toJSON(),
      },
    });
  } catch (error: any) {
    logger.error(`Get current admin error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin profile",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const logoutAdmin = async (
  req: Request & { adminId?: string },
  res: Response
): Promise<void> => {
  try {
    const adminId = req.adminId;
    if (!adminId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    await AdminUser.findByIdAndUpdate(adminId, {
      lastLogoutAt: new Date(),
    });

    logger.info(`✅ Admin logged out: ${adminId}`);

    res.status(200).json({
      success: true,
      message: "Admin logged out successfully",
    });
  } catch (error: any) {
    logger.error(`Admin logout error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: "Admin logout failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};



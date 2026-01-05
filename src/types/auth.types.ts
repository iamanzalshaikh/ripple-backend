import { Request } from "express";
import { UserRole } from "./index.js";

// ============================================
// REQUEST TYPES
// ============================================

export interface AuthRequest extends Request {
  userId?: string;
}

// ============================================
// AUTH ENUMS
// ============================================

export enum VerificationStatus {
  UNVERIFIED = "unverified",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum AccountStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
  BANNED = "banned",
}

export enum SuspensionReason {
  INAPPROPRIATE_BEHAVIOR = "inappropriate_behavior",
  VIOLATION_OF_WOMEN_ONLY = "violation_of_women_only",
  FAKE_VERIFICATION = "fake_verification",
  HARASSMENT = "harassment",
  FRAUD = "fraud",
  SPAM = "spam",
  OTHER = "other",
}

// ============================================
// OTP INTERFACE
// ============================================

export interface IOTP {
  code?: string;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  usedAt?: Date;
  expiresAt: Date;
}

// ============================================
// JWT INTERFACES
// ============================================

export interface IJwtPayload {
  userId: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse extends IAuthTokens {
  user: IAuthUser;
}

// ============================================
// AUTH USER INTERFACE
// ============================================

export interface IAuthUser {
  _id: string;
  phone: string;
  email?: string;
  name?: string;
  handle?: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  onboardingCompleted: boolean;
  onboardingStep: number;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// VERIFICATION INTERFACES
// ============================================

export interface IVerificationPhotos {
  bikeFront?: string;
  bikeWithRider?: string;
  dlFront?: string;
  dlBack?: string;
  rc?: string;
  selfie?: string;
}

export interface IVerificationRequest {
  dlFront?: string;
  dlBack?: string;
  rc?: string;
  selfie: string;
  bikeBrand: string;
  bikeModel: string;
  bikeYear?: number;
}

// ============================================
// EMERGENCY CONTACT INTERFACE
// ============================================

export interface IEmergencyContact {
  _id?: string;
  name: string;
  phone: string;
  email?: string;
  relation: string;
  priority: number;
  verified: boolean;
}

// ============================================
// ERROR INTERFACE
// ============================================

export interface IAuthError {
  statusCode: number;
  message: string;
  field?: string;
  errors?: { [key: string]: string };
}

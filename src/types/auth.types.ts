import type { Request } from "express";
import type { UserRole } from "./index.js";

export interface AuthRequest extends Request {
  userId?: string;
}

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

export interface IAuthUser {
  _id: string;
  phone: string;
  email?: string;
  name?: string;
  verified: boolean;
  verificationStatus: VerificationStatus;
  accountStatus: AccountStatus;
  onboardingCompleted: boolean;
  onboardingStep: number;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

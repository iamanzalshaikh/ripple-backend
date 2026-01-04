import { Request } from "express";
import { UserRole } from "./index.js";
export interface AuthRequest extends Request {
    userId?: string;
}
export declare enum VerificationStatus {
    UNVERIFIED = "unverified",
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected"
}
export declare enum AccountStatus {
    ACTIVE = "active",
    SUSPENDED = "suspended",
    DEACTIVATED = "deactivated",
    BANNED = "banned"
}
export declare enum SuspensionReason {
    INAPPROPRIATE_BEHAVIOR = "inappropriate_behavior",
    VIOLATION_OF_WOMEN_ONLY = "violation_of_women_only",
    FAKE_VERIFICATION = "fake_verification",
    HARASSMENT = "harassment",
    FRAUD = "fraud",
    SPAM = "spam",
    OTHER = "other"
}
export interface IOTP {
    code?: string;
    attempts: number;
    maxAttempts: number;
    isUsed: boolean;
    usedAt?: Date;
    expiresAt: Date;
}
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
export interface IEmergencyContact {
    _id?: string;
    name: string;
    phone: string;
    email?: string;
    relation: string;
    priority: number;
    verified: boolean;
}
export interface IAuthError {
    statusCode: number;
    message: string;
    field?: string;
    errors?: {
        [key: string]: string;
    };
}
//# sourceMappingURL=auth.types.d.ts.map
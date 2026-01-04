export interface IEmergencyContact {
    _id?: string;
    name: string;
    phone: string;
    email?: string;
    relation: string;
    priority: number;
    verified: boolean;
}
export interface IPrivacySettings {
    profileVisibility: 'public' | 'friends' | 'private';
    rideVisibility: 'public' | 'friends' | 'private';
    showLocation: boolean;
    allowMessages: boolean;
    allowFollowing: boolean;
    allowAIFeatures: boolean;
}
export interface IVerificationPhotos {
    bikeFront?: string;
    bikeWithRider?: string;
    dlFront?: string;
    dlBack?: string;
    rc?: string;
    selfie?: string;
}
export interface IOTP {
    code: string;
    attempts: number;
    maxAttempts: number;
    isUsed: boolean;
    usedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
}
export interface IUser {
    _id: string;
    phone: string;
    email?: string;
    handle?: string;
    name?: string;
    password?: string;
    otp: IOTP;
    avatarUrl?: string;
    bio?: string;
    country: string;
    state?: string;
    city?: string;
    verified: boolean;
    verificationStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
    verificationPhotos: IVerificationPhotos;
    verificationSubmittedAt?: Date;
    verificationApprovedAt?: Date;
    verificationReviewedBy?: string;
    verificationNotes?: string;
    emergencyContacts: IEmergencyContact[];
    bikes: string[];
    ridingStyle: string[];
    ridingLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
    ridingHours: number;
    yearsOfExperience: number;
    followers: string[];
    following: string[];
    followerCount: number;
    followingCount: number;
    totalBadges: number;
    badges: string[];
    totalDistance: number;
    totalRides: number;
    totalDuration: number;
    totalElevation: number;
    privacySettings: IPrivacySettings;
    onboardingCompleted: boolean;
    onboardingStep: number;
    lastLoginAt?: Date;
    lastLoginIP?: string;
    isCreator: boolean;
    creatorVerifiedAt?: Date;
    isSuspended: boolean;
    accountStatus?: string;
    suspensionReason?: string;
    suspendedAt?: Date;
    suspendedUntil?: Date;
    pushTokens: string[];
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
    getPublicProfile(): Partial<IUser>;
    getFullProfile(): IUser;
    recordLogin(ip: string): Promise<void>;
    isEmailVerified(): boolean;
    canPostAndSell(): boolean;
    toJSON(): Partial<IUser>;
}
export interface IOTPModel {
    _id: string;
    phone: string;
    email?: string;
    code: string;
    attempts: number;
    maxAttempts: number;
    isUsed: boolean;
    usedAt?: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
import { Document, Model } from 'mongoose';
interface IUserDocument extends Omit<IUser, '_id' | 'toJSON'>, Document {
}
interface IUserMethods {
    comparePassword(password: string): Promise<boolean>;
    getPublicProfile(): Partial<IUser>;
    getFullProfile(): IUser;
    recordLogin(ip: string): Promise<void>;
    isEmailVerified(): boolean;
    canPostAndSell(): boolean;
}
type IUserModel = Model<IUserDocument, {}, IUserMethods>;
declare const User: IUserModel;
export default User;
//# sourceMappingURL=user.model.d.ts.map
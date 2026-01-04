// export interface IEmergencyContact {
//     _id?: string;
//     name: string;
//     phone: string;
//     email?: string;
//     relation: string;
//     priority: number;
//     verified: boolean;
//   }
// ============================================
// File: models/User.ts
// ============================================
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
const emergencyContactSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        match: /^[0-9]{10}$/,
    },
    email: {
        type: String,
        required: false,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    relation: {
        type: String,
        required: true,
    },
    priority: {
        type: Number,
        default: 1,
    },
    verified: {
        type: Boolean,
        default: false,
    },
}, { _id: true });
const verificationPhotosSchema = new Schema({
    bikeFront: String,
    bikeWithRider: String,
    dlFront: String,
    dlBack: String,
    rc: String,
    selfie: String
}, { _id: false });
const privacySettingsSchema = new Schema({
    profileVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'friends'
    },
    rideVisibility: {
        type: String,
        enum: ['public', 'friends', 'private'],
        default: 'friends'
    },
    showLocation: { type: Boolean, default: false },
    allowMessages: { type: Boolean, default: true },
    allowFollowing: { type: Boolean, default: true },
    allowAIFeatures: { type: Boolean, default: true }
}, { _id: false });
const otpSchema = new Schema({
    code: { type: String },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    isUsed: { type: Boolean, default: false },
    usedAt: Date,
    expiresAt: { type: Date }
}, { _id: false });
const userSchema = new Schema({
    // Core Identity
    phone: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        match: /^[0-9]{10}$/
    },
    email: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    handle: {
        type: String,
        unique: true,
        sparse: true,
        lowercase: true,
        minlength: 3,
        maxlength: 20
    },
    name: { type: String, trim: true },
    password: String,
    // OTP (Embedded)
    otp: { type: otpSchema, default: {} },
    // Profile
    avatarUrl: String,
    bio: { type: String, maxlength: 500 },
    country: { type: String, default: 'India' },
    state: String,
    city: String,
    // Verification
    verified: { type: Boolean, default: false },
    verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'approved', 'rejected'],
        default: 'unverified'
    },
    verificationPhotos: { type: verificationPhotosSchema, default: {} },
    verificationSubmittedAt: Date,
    verificationApprovedAt: Date,
    verificationReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verificationNotes: String,
    // Safety
    emergencyContacts: [emergencyContactSchema],
    // Bikes
    bikes: [{ type: Schema.Types.ObjectId, ref: 'Bike' }],
    // Riding
    ridingStyle: [{
            type: String,
            enum: ['Track', 'Touring', 'Street', 'Commute', 'Racing']
        }],
    ridingLevel: {
        type: String,
        enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
        default: 'Beginner'
    },
    ridingHours: { type: Number, default: 0 },
    yearsOfExperience: { type: Number, default: 0 },
    // Community
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    // Achievements
    totalBadges: { type: Number, default: 0 },
    badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],
    totalDistance: { type: Number, default: 0 },
    totalRides: { type: Number, default: 0 },
    totalDuration: { type: Number, default: 0 },
    totalElevation: { type: Number, default: 0 },
    // Privacy
    privacySettings: { type: privacySettingsSchema, default: {} },
    // Onboarding
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: Number, default: 0 },
    lastLoginAt: Date,
    lastLoginIP: String,
    // Account
    isCreator: { type: Boolean, default: false },
    creatorVerifiedAt: Date,
    isSuspended: { type: Boolean, default: false },
    suspensionReason: String,
    suspendedAt: Date,
    suspendedUntil: Date,
    // Push Tokens
    pushTokens: { type: [String], default: [] }
}, {
    timestamps: true,
    collection: 'users'
});
// ============================================
// Indexes
// ============================================
userSchema.index({ phone: 1 });
userSchema.index({ email: 1 });
userSchema.index({ handle: 1 });
userSchema.index({ city: 1, verified: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ followerCount: -1 });
userSchema.index({ totalDistance: -1 });
// ============================================
// Middleware - Hash password before save
// ============================================
userSchema.pre('save', async function (next) {
    if (!this.isModified('password'))
        return next();
    try {
        const salt = await bcrypt.genSalt(10);
        const doc = this;
        doc.password = await bcrypt.hash(doc.password, salt);
        next();
    }
    catch (err) {
        next(err);
    }
});
// ============================================
// Methods
// ============================================
userSchema.methods.comparePassword = async function (enteredPassword) {
    const user = this;
    return await bcrypt.compare(enteredPassword, user.password || '');
};
userSchema.methods.getPublicProfile = function () {
    const user = this;
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.emergencyContacts;
    delete userObj.privacySettings;
    delete userObj.pushTokens;
    delete userObj.lastLoginIP;
    return userObj;
};
userSchema.methods.getFullProfile = function () {
    const user = this;
    return user.toObject();
};
userSchema.methods.recordLogin = async function (ip) {
    const user = this;
    user.lastLoginAt = new Date();
    user.lastLoginIP = ip;
    await user.save();
};
userSchema.methods.isEmailVerified = function () {
    const user = this;
    return !!user.email && user.verificationStatus === 'approved';
};
userSchema.methods.canPostAndSell = function () {
    const user = this;
    return user.verified && user.verificationStatus === 'approved';
};
userSchema.methods.toJSON = function () {
    const user = this;
    const obj = user.toObject();
    delete obj.password;
    delete obj.pushTokens;
    delete obj.lastLoginIP;
    return obj;
};
const User = mongoose.model('User', userSchema);
export default User;
//# sourceMappingURL=user.model.js.map
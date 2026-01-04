
// export interface IEmergencyContact {
//     _id?: string;
//     name: string;
//     phone: string;
//     email?: string;
//     relation: string;
//     priority: number;
//     verified: boolean;
//   }
  
//   export interface IPrivacySettings {
//     profileVisibility: 'public' | 'friends' | 'private';
//     rideVisibility: 'public' | 'friends' | 'private';
//     showLocation: boolean;
//     allowMessages: boolean;
//     allowFollowing: boolean;
//     allowAIFeatures: boolean;
//   }
  
//   export interface IVerificationPhotos {
//     bikeFront?: string;
//     bikeWithRider?: string;
//     dlFront?: string;
//     dlBack?: string;
//     rc?: string;
//     selfie?: string;
//   }
  
//   export interface IOTP {
//     code: string;
//     attempts: number;
//     maxAttempts: number;
//     isUsed: boolean;
//     usedAt?: Date;
//     expiresAt: Date;
//     createdAt: Date;
//   }
  
//   export interface IUser {
//     _id: string;
//     phone: string;
//     email?: string;
//     handle?: string;
//     name?: string;
//     password?: string;
    
//     // OTP (Embedded)
//     otp: IOTP;
    
//     // Profile
//     avatarUrl?: string;
//     bio?: string;
//     country: string;
//     state?: string;
//     city?: string;
    
//     // Verification
//     verified: boolean;
//     verificationStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
//     verificationPhotos: IVerificationPhotos;
//     verificationSubmittedAt?: Date;
//     verificationApprovedAt?: Date;
//     verificationReviewedBy?: string;
//     verificationNotes?: string;
    
//     // Safety
//     emergencyContacts: IEmergencyContact[];
    
//     // Bikes
//     bikes: string[];
    
//     // Riding
//     ridingStyle: string[];
//     ridingLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
//     ridingHours: number;
//     yearsOfExperience: number;
    
//     // Community
//     followers: string[];
//     following: string[];
//     followerCount: number;
//     followingCount: number;
    
//     // Achievements
//     totalBadges: number;
//     badges: string[];
//     totalDistance: number;
//     totalRides: number;
//     totalDuration: number;
//     totalElevation: number;
    
//     // Privacy
//     privacySettings: IPrivacySettings;
    
//     // Onboarding
//     onboardingCompleted: boolean;
//     onboardingStep: number;
//     lastLoginAt?: Date;
//     lastLoginIP?: string;
    
//     // Account
//     isCreator: boolean;
//     creatorVerifiedAt?: Date;
//     isSuspended: boolean;
//     suspensionReason?: string;
//     suspendedAt?: Date;
//     suspendedUntil?: Date;
    
//     // Notifications
//     pushTokens: string[];
    
//     // Timestamps
//     createdAt: Date;
//     updatedAt: Date;
    
//     // Methods
//     comparePassword(password: string): Promise<boolean>;
//     getPublicProfile(): Partial<IUser>;
//     getFullProfile(): IUser;
//     recordLogin(ip: string): Promise<void>;
//     isEmailVerified(): boolean;
//     canPostAndSell(): boolean;
//     toJSON(): Partial<IUser>;
//   }
  
//   export interface IOTP {
//     _id: string;
//     phone: string;
//     email?: string;
//     code: string;
//     attempts: number;
//     maxAttempts: number;
//     isUsed: boolean;
//     usedAt?: Date;
//     expiresAt: Date;
//     createdAt: Date;
//     updatedAt: Date;
//   }
  
//   // ============================================
//   // File: models/User.ts
//   // ============================================
//   import mongoose, { Schema, Document, Model } from 'mongoose';
//   import bcrypt from 'bcryptjs';
//   import { IUser, IEmergencyContact, IPrivacySettings, IVerificationPhotos } from '../types/index.js';
  
//   interface IUserDocument extends IUser, Document {}
  
//   interface IUserMethods {
//     comparePassword(password: string): Promise<boolean>;
//     getPublicProfile(): Partial<IUser>;
//     getFullProfile(): IUser;
//     recordLogin(ip: string): Promise<void>;
//     isEmailVerified(): boolean;
//     canPostAndSell(): boolean;
//   }
  
//   type IUserModel = Model<IUserDocument, {}, IUserMethods>;
  
//   // const emergencyContactSchema = new Schema<IEmergencyContact>(
//   //   {
//   //     name: {
//   //       type: String,
//   //       required: true,
//   //       trim: true,
//   //     },
  
//   //     phone: {
//   //       type: String,
//   //       required: true,
//   //       trim: true,
//   //       match: /^[0-9]{10}$/,
//   //     },
  
//   //     email: {
//   //       type: String,
//   //       required: false, // ✅ OPTIONAL
//   //       lowercase: true,
//   //       match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
//   //     },
  
//   //     relation: {
//   //       type: String,
//   //       required: true,
//   //     },
  
//   //     priority: {
//   //       type: Number,
//   //       default: 1,
//   //     },
  
//   //     verified: {
//   //       type: Boolean,
//   //       default: false,
//   //     },
//   //   },
//   //   { _id: false }
//   // );
  



// // ============================================
// // AFTER (✅ Correct - _id enabled)
// // ============================================
// const emergencyContactSchema = new Schema<IEmergencyContact>(
//   {
//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     phone: {
//       type: String,
//       required: true,
//       trim: true,
//       match: /^[0-9]{10}$/,
//     },

//     email: {
//       type: String,
//       required: false,
//       lowercase: true,
//       match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
//     },

//     relation: {
//       type: String,
//       required: true,
//     },

//     priority: {
//       type: Number,
//       default: 1,
//     },

//     verified: {
//       type: Boolean,
//       default: false,
//     },
//   },
//   { _id: true }  // ✅ ENABLE _id GENERATION (or just remove this line)
// );

  
  
//   const verificationPhotosSchema = new Schema<IVerificationPhotos>(
//     {
//       bikeFront: String,
//       bikeWithRider: String,
//       dlFront: String,
//       dlBack: String,
//       rc: String,
//       selfie: String
//     },
//     { _id: false }
//   );
  
//   const privacySettingsSchema = new Schema<IPrivacySettings>(
//     {
//       profileVisibility: { 
//         type: String, 
//         enum: ['public', 'friends', 'private'], 
//         default: 'friends' 
//       },
//       rideVisibility: { 
//         type: String, 
//         enum: ['public', 'friends', 'private'], 
//         default: 'friends' 
//       },
//       showLocation: { type: Boolean, default: false },
//       allowMessages: { type: Boolean, default: true },
//       allowFollowing: { type: Boolean, default: true },
//       allowAIFeatures: { type: Boolean, default: true }
//     },
//     { _id: false }
//   );
  
//   const otpSchema = new Schema<IOTP>(
//     {
//       code: { type: String },
//       attempts: { type: Number, default: 0 },
//       maxAttempts: { type: Number, default: 5 },
//       isUsed: { type: Boolean, default: false },
//       usedAt: Date,
//       expiresAt: { type: Date }
//     },
//     { _id: false }
//   );
  
//   const userSchema = new Schema<IUserDocument, IUserModel, IUserMethods>(
//     {
//       // Core Identity
//       phone: { 
//         type: String, 
//         unique: true, 
//         required: true, 
//         trim: true,
//         match: /^[0-9]{10}$/
//       },
//       email: { 
//         type: String, 
//         unique: true, 
//         sparse: true, 
//         lowercase: true,
//         match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
//       },
//       handle: { 
//         type: String, 
//         unique: true, 
//         sparse: true, 
//         lowercase: true,
//         minlength: 3,
//         maxlength: 20
//       },
//       name: { type: String, trim: true },
//       password: String,
  
//       // OTP (Embedded)
//       otp: { type: otpSchema, default: {} },
  
//       // Profile
//       avatarUrl: String,
//       bio: { type: String, maxlength: 500 },
//       country: { type: String, default: 'India' },
//       state: String,
//       city: String,
      
//       // Verification
//       verified: { type: Boolean, default: false },
//       verificationStatus: { 
//         type: String, 
//         enum: ['unverified', 'pending', 'approved', 'rejected'], 
//         default: 'unverified' 
//       },
//       verificationPhotos: { type: verificationPhotosSchema, default: {} },
//       verificationSubmittedAt: Date,
//       verificationApprovedAt: Date,
//       verificationReviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
//       verificationNotes: String,
  
//       // Safety
//       emergencyContacts: { type: [emergencyContactSchema], default: [] },
  
//       // Bikes
//       bikes: [{ type: Schema.Types.ObjectId, ref: 'Bike' }],
      
//       // Riding
//       ridingStyle: [{ 
//         type: String, 
//         enum: ['Track', 'Touring', 'Street', 'Commute', 'Racing']
//       }],
//       ridingLevel: { 
//         type: String, 
//         enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
//         default: 'Beginner'
//       },
//       ridingHours: { type: Number, default: 0 },
//       yearsOfExperience: { type: Number, default: 0 },
  
//       // Community
//       followers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
//       following: [{ type: Schema.Types.ObjectId, ref: 'User' }],
//       followerCount: { type: Number, default: 0 },
//       followingCount: { type: Number, default: 0 },
  
//       // Achievements
//       totalBadges: { type: Number, default: 0 },
//       badges: [{ type: Schema.Types.ObjectId, ref: 'Badge' }],
//       totalDistance: { type: Number, default: 0 },
//       totalRides: { type: Number, default: 0 },
//       totalDuration: { type: Number, default: 0 },
//       totalElevation: { type: Number, default: 0 },
  
//       // Privacy
//       privacySettings: { type: privacySettingsSchema, default: {} },
  
//       // Onboarding
//       onboardingCompleted: { type: Boolean, default: false },
//       onboardingStep: { type: Number, default: 0 },
//       lastLoginAt: Date,
//       lastLoginIP: String,
  
//       // Account
//       isCreator: { type: Boolean, default: false },
//       creatorVerifiedAt: Date,
//       isSuspended: { type: Boolean, default: false },
//       suspensionReason: String,
//       suspendedAt: Date,
//       suspendedUntil: Date,
  
//       // Push Tokens
//       pushTokens: { type: [String], default: [] }
//     },
//     { 
//       timestamps: true,
//       collection: 'users'
//     }
//   );
  
//   // ============================================
//   // Indexes
//   // ============================================
//   userSchema.index({ phone: 1 });
//   userSchema.index({ email: 1 });
//   userSchema.index({ handle: 1 });
//   userSchema.index({ city: 1, verified: 1 });
//   userSchema.index({ createdAt: -1 });
//   userSchema.index({ followerCount: -1 });
//   userSchema.index({ totalDistance: -1 });
  
//   // ============================================
//   // Middleware - Hash password before save
//   // ============================================
//   userSchema.pre('save', async function(next) {
//     if (!this.isModified('password')) return next();
    
//     try {
//       const salt = await bcrypt.genSalt(10);
//       this.password = await bcrypt.hash(this.password!, salt);
//       next();
//     } catch (err) {
//       next(err as Error);
//     }
//   });
  
//   // ============================================
//   // Methods
//   // ============================================
//   userSchema.methods.comparePassword = async function(enteredPassword: string): Promise<boolean> {
//     return await bcrypt.compare(enteredPassword, this.password || '');
//   };
  
//   userSchema.methods.getPublicProfile = function(): Partial<IUser> {
//     const userObj = this.toObject();
//     delete userObj.password;
//     delete userObj.emergencyContacts;
//     delete userObj.privacySettings;
//     delete userObj.pushTokens;
//     delete userObj.lastLoginIP;
//     return userObj;
//   };
  
//   userSchema.methods.getFullProfile = function(): IUser {
//     return this.toObject();
//   };
  
//   userSchema.methods.recordLogin = async function(ip: string): Promise<void> {
//     this.lastLoginAt = new Date();
//     this.lastLoginIP = ip;
//     await this.save();
//   };
  
//   userSchema.methods.isEmailVerified = function(): boolean {
//     return !!this.email && this.verificationStatus === 'approved';
//   };
  
//   userSchema.methods.canPostAndSell = function(): boolean {
//     return this.verified && this.verificationStatus === 'approved';
//   };
  
//   userSchema.methods.toJSON = function() {
//     const obj = this.toObject();
//     delete obj.password;
//     delete obj.pushTokens;
//     delete obj.lastLoginIP;
//     return obj;
//   };
  
//   const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);
  
//   export default User;



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
  
  // OTP (Embedded)
  otp: IOTP;
  
  // Profile
  avatarUrl?: string;
  bio?: string;
  country: string;
  state?: string;
  city?: string;
  
  // Verification
  verified: boolean;
  verificationStatus: 'unverified' | 'pending' | 'approved' | 'rejected';
  verificationPhotos: IVerificationPhotos;
  verificationSubmittedAt?: Date;
  verificationApprovedAt?: Date;
  verificationReviewedBy?: string;
  verificationNotes?: string;
  
  // Safety
  emergencyContacts: IEmergencyContact[];
  
  // Bikes
  bikes: string[];
  
  // Riding
  ridingStyle: string[];
  ridingLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
  ridingHours: number;
  yearsOfExperience: number;
  
  // Community
  followers: string[];
  following: string[];
  followerCount: number;
  followingCount: number;
  
  // Achievements
  totalBadges: number;
  badges: string[];
  totalDistance: number;
  totalRides: number;
  totalDuration: number;
  totalElevation: number;
  
  // Privacy
  privacySettings: IPrivacySettings;
  
  // Onboarding
  onboardingCompleted: boolean;
  onboardingStep: number;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  
  // Account
  isCreator: boolean;
  creatorVerifiedAt?: Date;
  isSuspended: boolean;
  accountStatus?: string;
  suspensionReason?: string;
  suspendedAt?: Date;
  suspendedUntil?: Date;
  
  // Notifications
  pushTokens: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
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

// ============================================
// File: models/User.ts
// ============================================
import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IUserDocument extends Omit<IUser, '_id' | 'toJSON'>, Document {}

interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
  getPublicProfile(): Partial<IUser>;
  getFullProfile(): IUser;
  recordLogin(ip: string): Promise<void>;
  isEmailVerified(): boolean;
  canPostAndSell(): boolean;
}

type IUserModel = Model<IUserDocument, {}, IUserMethods>;

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
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
  },
  { _id: true }
);



const verificationPhotosSchema = new Schema<IVerificationPhotos>(
  {
    bikeFront: String,
    bikeWithRider: String,
    dlFront: String,
    dlBack: String,
    rc: String,
    selfie: String
  },
  { _id: false }
);

const privacySettingsSchema = new Schema<IPrivacySettings>(
  {
    profileVisibility: { 
      type: String, 
      enum: ['public', 'friends', 'private'], 
      default: 'friends' 
    } as any,
    rideVisibility: { 
      type: String, 
      enum: ['public', 'friends', 'private'], 
      default: 'friends' 
    } as any,
    showLocation: { type: Boolean, default: false },
    allowMessages: { type: Boolean, default: true },
    allowFollowing: { type: Boolean, default: true },
    allowAIFeatures: { type: Boolean, default: true }
  },
  { _id: false }
);

const otpSchema = new Schema<IOTP>(
  {
    code: { type: String },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    isUsed: { type: Boolean, default: false },
    usedAt: Date,
    expiresAt: { type: Date }
  },
  { _id: false }
);

const userSchema = new Schema<IUserDocument, IUserModel, IUserMethods>(
  {
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
    } as any,
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
  },
  { 
    timestamps: true,
    collection: 'users'
  }
);

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
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    const doc = this as unknown as IUserDocument;
    doc.password = await bcrypt.hash(doc.password!, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

// ============================================
// Methods
// ============================================
userSchema.methods.comparePassword = async function(enteredPassword: string): Promise<boolean> {
  const user = this as unknown as IUserDocument;
  return await bcrypt.compare(enteredPassword, user.password || '');
};

userSchema.methods.getPublicProfile = function(): Partial<IUser> {
  const user = this as unknown as IUserDocument;
  const userObj = user.toObject();
  delete (userObj as any).password;
  delete (userObj as any).emergencyContacts;
  delete (userObj as any).privacySettings;
  delete (userObj as any).pushTokens;
  delete (userObj as any).lastLoginIP;
  return userObj;
};

userSchema.methods.getFullProfile = function(): IUser {
  const user = this as unknown as IUserDocument;
  return user.toObject();
};

userSchema.methods.recordLogin = async function(ip: string): Promise<void> {
  const user = this as unknown as IUserDocument;
  user.lastLoginAt = new Date();
  user.lastLoginIP = ip;
  await user.save();
};

userSchema.methods.isEmailVerified = function(): boolean {
  const user = this as unknown as IUserDocument;
  return !!user.email && user.verificationStatus === 'approved';
};

userSchema.methods.canPostAndSell = function(): boolean {
  const user = this as unknown as IUserDocument;
  return user.verified && user.verificationStatus === 'approved';
};

userSchema.methods.toJSON = function() {
  const user = this as unknown as IUserDocument;
  const obj = user.toObject();
  delete (obj as any).password;
  delete (obj as any).pushTokens;
  delete (obj as any).lastLoginIP;
  return obj;
};

const User = mongoose.model<IUserDocument, IUserModel>('User', userSchema);

export default User;
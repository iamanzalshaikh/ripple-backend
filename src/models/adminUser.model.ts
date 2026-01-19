import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export enum AdminRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  SUPPORT = "support",
}

export enum AdminAccountStatus {
  ACTIVE = "active",
  SUSPENDED = "suspended",
  DEACTIVATED = "deactivated",
  BANNED = "banned",
}

export interface IAdminUser {
  _id: string;
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  status: AdminAccountStatus;
  lastLoginAt?: Date;
  lastLoginIP?: string;
  lastLogoutAt?: Date;
  failedLoginAttempts: number;
  lastFailedLoginAt?: Date;
  isLocked: boolean;
  lockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IAdminUserDocument extends Omit<IAdminUser, "_id">, Document {}

interface IAdminUserMethods {
  comparePassword(password: string): Promise<boolean>;
  recordLogin(ip: string): Promise<void>;
  toJSON(): Partial<IAdminUser>;
}

type IAdminUserModel = Model<IAdminUserDocument, {}, IAdminUserMethods>;

const adminUserSchema = new Schema<IAdminUserDocument, IAdminUserModel, IAdminUserMethods>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: Object.values(AdminRole),
      default: AdminRole.ADMIN,
    } as any,
    status: {
      type: String,
      enum: Object.values(AdminAccountStatus),
      default: AdminAccountStatus.ACTIVE,
    } as any,
    lastLoginAt: Date,
    lastLoginIP: String,
    lastLogoutAt: Date,
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lastFailedLoginAt: Date,
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedUntil: Date,
  },
  {
    timestamps: true,
    collection: "admin_users",
  }
);

adminUserSchema.index({ email: 1 }, { unique: true });
adminUserSchema.index({ role: 1 });
adminUserSchema.index({ status: 1 });

adminUserSchema.pre("save", async function (next) {
  const admin = this as unknown as IAdminUserDocument;

  if (!admin.isModified("password")) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(admin.password, salt);
    next();
  } catch (err) {
    next(err as Error);
  }
});

adminUserSchema.methods.comparePassword = async function (
  enteredPassword: string
): Promise<boolean> {
  const admin = this as unknown as IAdminUserDocument;
  return bcrypt.compare(enteredPassword, admin.password);
};

adminUserSchema.methods.recordLogin = async function (ip: string): Promise<void> {
  const admin = this as unknown as IAdminUserDocument;
  admin.lastLoginAt = new Date();
  admin.lastLoginIP = ip;
  admin.failedLoginAttempts = 0;
  admin.isLocked = false;
  admin.lockedUntil = undefined;
  await admin.save();
};

adminUserSchema.methods.toJSON = function (): Partial<IAdminUser> {
  const admin = this as unknown as IAdminUserDocument;
  const obj = admin.toObject() as any;
  delete obj.password;
  delete obj.failedLoginAttempts;
  delete obj.lastFailedLoginAt;
  delete obj.isLocked;
  delete obj.lockedUntil;
  return obj;
};

const AdminUser = mongoose.model<IAdminUserDocument, IAdminUserModel>(
  "AdminUser",
  adminUserSchema
);

export default AdminUser;



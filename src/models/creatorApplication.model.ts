// ==========================================
// File: src/models/creatorApplication.model.ts
// Creator Application Model
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface ICreatorApplication extends Document {
  userId: mongoose.Types.ObjectId;
  creatorHandle: string;
  city?: string;
  state?: string;
  socialLinks: {
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  contentCategory: string[]; // e.g. ["Tour", "Safety", "Reviews"]
  avgViews?: number;
  followers?: number;
  proofLinks: string[]; // screenshots of insights
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  approvedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
  mediaKitUrl?: string; // Generated PDF URL
  createdAt: Date;
  updatedAt: Date;
}

const creatorApplicationSchema = new Schema<ICreatorApplication>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    creatorHandle: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    city: String,
    state: String,
    socialLinks: {
      instagram: String,
      youtube: String,
      tiktok: String,
    },
    contentCategory: [
      {
        type: String,
        enum: ["Tour", "Safety", "Reviews", "Gear", "Events", "Lifestyle", "Other"],
      },
    ],
    avgViews: Number,
    followers: Number,
    proofLinks: [String],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: String,
    approvedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    mediaKitUrl: String,
  },
  {
    timestamps: true,
    collection: "creator_applications",
  }
);

// Indexes
creatorApplicationSchema.index({ status: 1, createdAt: -1 });
creatorApplicationSchema.index({ userId: 1 });
creatorApplicationSchema.index({ creatorHandle: 1 });

const CreatorApplication = mongoose.model<ICreatorApplication>(
  "CreatorApplication",
  creatorApplicationSchema
);

export default CreatorApplication;


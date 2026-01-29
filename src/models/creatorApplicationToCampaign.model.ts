// ==========================================
// File: src/models/creatorApplicationToCampaign.model.ts
// Junction: Creator applies to Campaign
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface ICreatorApplicationToCampaign extends Document {
  creatorId: mongoose.Types.ObjectId;
  campaignId: mongoose.Types.ObjectId;
  proposal: string; // Content plan
  expectedPosts: number;
  priceQuote?: number; // null if fixed budget
  status: "applied" | "shortlisted" | "selected" | "rejected";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const creatorApplicationToCampaignSchema = new Schema<ICreatorApplicationToCampaign>(
  {
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    proposal: {
      type: String,
      required: true,
    },
    expectedPosts: {
      type: Number,
      required: true,
      min: 1,
    },
    priceQuote: Number,
    status: {
      type: String,
      enum: ["applied", "shortlisted", "selected", "rejected"],
      default: "applied",
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejectionReason: String,
  },
  {
    timestamps: true,
    collection: "creator_campaign_applications",
  }
);

// Indexes
creatorApplicationToCampaignSchema.index({ creatorId: 1, status: 1 });
creatorApplicationToCampaignSchema.index({ campaignId: 1, status: 1 });
creatorApplicationToCampaignSchema.index({ creatorId: 1, campaignId: 1 }, { unique: true }); // One application per creator per campaign

const CreatorApplicationToCampaign = mongoose.model<ICreatorApplicationToCampaign>(
  "CreatorApplicationToCampaign",
  creatorApplicationToCampaignSchema
);

export default CreatorApplicationToCampaign;




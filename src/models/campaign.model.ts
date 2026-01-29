// ==========================================
// File: src/models/campaign.model.ts
// Campaign Model (Brand creates, Admin approves)
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface ICampaign extends Document {
  brandId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  targeting: {
    cities?: string[];
    states?: string[];
    contentCategories?: string[];
  };
  heroImage?: string; // main image for campaign cards
  budgetRange: {
    min: number;
    max: number;
  };
  deliverables: string; // e.g. "3 Reels + 2 Posts"
  timeline: {
    start: Date;
    end: Date;
  };
  applicationDeadline: Date;
  status: "draft" | "active" | "closed";
  approvedByAdmin: boolean;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId; // Admin who approved
  createdAt: Date;
  updatedAt: Date;
}

const campaignSchema = new Schema<ICampaign>(
  {
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    targeting: {
      cities: [String],
      states: [String],
      contentCategories: [String],
    },
  heroImage: {
    type: String,
  },
    budgetRange: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
    },
    deliverables: {
      type: String,
      required: true,
    },
    timeline: {
      start: {
        type: Date,
        required: true,
      },
      end: {
        type: Date,
        required: true,
      },
    },
    applicationDeadline: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "closed"],
      default: "draft",
      index: true,
    },
    approvedByAdmin: {
      type: Boolean,
      default: false,
    },
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "campaigns",
  }
);

// Indexes
campaignSchema.index({ status: 1, applicationDeadline: 1 });
campaignSchema.index({ brandId: 1, status: 1 });
campaignSchema.index({ "targeting.cities": 1 });
campaignSchema.index({ "targeting.states": 1 });

const Campaign = mongoose.model<ICampaign>("Campaign", campaignSchema);

export default Campaign;




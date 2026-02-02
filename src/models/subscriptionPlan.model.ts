import mongoose, { Document, Schema } from "mongoose";

export interface ISubscriptionPlan extends Document {
  name: string; // 'Free Plan', 'Pro Monthly', 'Pro 6-Month', 'Pro Annual'
  tier: "free" | "pro";
  duration: number; // months (1, 6, 12)
  basePrice: number; // ₹500 for monthly
  finalPrice: number; // ₹500, ₹2500 (6mo), ₹5000 (12mo)
  discount: number; // 0, 1, 2 (free months)
  features: {
    ridesPerMonth: number; // 3 for free, -1 (unlimited) for pro
    eventsAccess: "free_only" | "all";
    marketplaceAccess: boolean;
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    tier: {
      type: String,
      enum: ["free", "pro"],
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    finalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    features: {
      ridesPerMonth: {
        type: Number,
        required: true,
        default: 0, // -1 means unlimited
      },
      eventsAccess: {
        type: String,
        enum: ["free_only", "all"],
        default: "free_only",
      },
      marketplaceAccess: {
        type: Boolean,
        default: false,
      },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, collection: "subscription_plans" }
);

// Indexes
subscriptionPlanSchema.index({ tier: 1, active: 1 });
subscriptionPlanSchema.index({ active: 1 });

const SubscriptionPlan = mongoose.model<ISubscriptionPlan>(
  "SubscriptionPlan",
  subscriptionPlanSchema
);

export default SubscriptionPlan;


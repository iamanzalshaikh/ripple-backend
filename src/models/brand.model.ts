// ==========================================
// File: src/models/brand.model.ts
// Brand Model (Admin-created)
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface IBrand extends Document {
  name: string;
  logo?: string;
  category: string; // e.g. "helmets", "gear", "tours", "accessories"
  verified: boolean;
  createdByAdmin: mongoose.Types.ObjectId; // Admin who created this brand
  description?: string;
  website?: string;
  contactEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const brandSchema = new Schema<IBrand>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    logo: String,
    category: {
      type: String,
      enum: [
        "helmets",
        "gear",
        "tours",
        "accessories",
        "bikes",
        "services",
        "other",
      ],
      default: "other",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    createdByAdmin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: String,
    website: String,
    contactEmail: String,
  },
  {
    timestamps: true,
    collection: "brands",
  }
);

// Indexes
brandSchema.index({ name: 1 });
brandSchema.index({ verified: 1 });
brandSchema.index({ category: 1 });

const Brand = mongoose.model<IBrand>("Brand", brandSchema);

export default Brand;




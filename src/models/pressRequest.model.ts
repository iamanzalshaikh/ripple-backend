// ==========================================
// File: src/models/pressRequest.model.ts
// Press & Collaboration Request Model
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface IPressRequest extends Document {
  requesterName: string;
  email: string;
  type: "journalist" | "tourism" | "podcast" | "media" | "collaboration" | "other";
  description: string;
  organization?: string;
  status: "pending" | "approved" | "rejected" | "contacted";
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId; // Admin who reviewed
  notes?: string; // Admin notes
  createdAt: Date;
  updatedAt: Date;
}

const pressRequestSchema = new Schema<IPressRequest>(
  {
    requesterName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      index: true,
    },
    type: {
      type: String,
      enum: ["journalist", "tourism", "podcast", "media", "collaboration", "other"],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    organization: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "contacted"],
      default: "pending",
      index: true,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: String,
  },
  {
    timestamps: true,
    collection: "press_requests",
  }
);

// Indexes
pressRequestSchema.index({ status: 1, createdAt: -1 });
pressRequestSchema.index({ email: 1 });

const PressRequest = mongoose.model<IPressRequest>("PressRequest", pressRequestSchema);

export default PressRequest;




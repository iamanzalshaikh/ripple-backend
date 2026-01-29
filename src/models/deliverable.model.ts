// ==========================================
// File: src/models/deliverable.model.ts
// Deliverable Model (Creator submits content)
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface IDeliverable extends Document {
  contractId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  description: string; // What was required
  postId?: mongoose.Types.ObjectId; // Reference to Post if linked
  postUrl?: string; // Direct URL to post
  draftUrl?: string; // Draft content URL
  insightsScreenshot?: string; // Screenshot of analytics
  submittedAt: Date;
  approved: boolean;
  approvedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId; // Admin/Brand who approved
  feedback?: string; // Rejection feedback or notes
  rejectedAt?: Date;
  resubmitted: boolean; // If creator resubmitted after rejection
  createdAt: Date;
  updatedAt: Date;
}

const deliverableSchema = new Schema<IDeliverable>(
  {
    contractId: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    postId: {
      type: Schema.Types.ObjectId,
      ref: "Post",
    },
    postUrl: String,
    draftUrl: String,
    insightsScreenshot: String,
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    approved: {
      type: Boolean,
      default: false,
      index: true,
    },
    approvedAt: Date,
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    feedback: String,
    rejectedAt: Date,
    resubmitted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "deliverables",
  }
);

// Indexes
deliverableSchema.index({ contractId: 1, approved: 1 });
deliverableSchema.index({ creatorId: 1, approved: 1 });
deliverableSchema.index({ contractId: 1, createdAt: -1 });

const Deliverable = mongoose.model<IDeliverable>("Deliverable", deliverableSchema);

export default Deliverable;




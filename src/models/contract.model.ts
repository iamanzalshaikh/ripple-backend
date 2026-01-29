// ==========================================
// File: src/models/contract.model.ts
// Contract Model (Created after creator selected)
// ==========================================
import mongoose, { Schema, Document } from "mongoose";

export interface IMilestone {
  description: string;
  amount: number;
  dueDate: Date;
  status: "pending" | "paid" | "cancelled";
  paid: boolean;
  paidAt?: Date;
  paymentId?: mongoose.Types.ObjectId; // Reference to Payment
}

export interface IContract extends Document {
  campaignId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  brandId: mongoose.Types.ObjectId;
  terms: string; // Auto-generated template or custom
  deliverables: string[]; // List of deliverables
  paymentTerms: string; // e.g. "50% upfront, 50% on completion"
  escrowAmount: number;
  escrowOrderId?: string; // Razorpay Order ID
  escrowStatus: "pending" | "held" | "released" | "refunded";
  milestones: IMilestone[];
  signedAt?: Date;
  status: "pending" | "active" | "completed" | "cancelled";
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const milestoneSchema = new Schema<IMilestone>(
  {
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "pending",
    },
    paid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { _id: false }
);

const contractSchema = new Schema<IContract>(
  {
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    brandId: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    terms: {
      type: String,
      required: true,
    },
    deliverables: [String],
    paymentTerms: {
      type: String,
      required: true,
    },
    escrowAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    escrowOrderId: String,
    escrowStatus: {
      type: String,
      enum: ["pending", "held", "released", "refunded"],
      default: "pending",
    },
    milestones: [milestoneSchema],
    signedAt: Date,
    status: {
      type: String,
      enum: ["pending", "active", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    cancelledAt: Date,
    cancellationReason: String,
  },
  {
    timestamps: true,
    collection: "contracts",
  }
);

// Indexes
contractSchema.index({ creatorId: 1, status: 1 });
contractSchema.index({ brandId: 1, status: 1 });
contractSchema.index({ campaignId: 1 });
contractSchema.index({ status: 1, createdAt: -1 });

const Contract = mongoose.model<IContract>("Contract", contractSchema);

export default Contract;




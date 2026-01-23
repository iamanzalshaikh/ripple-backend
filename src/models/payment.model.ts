import mongoose, { Document, Schema } from "mongoose";

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId;
  rideEventId: mongoose.Types.ObjectId;
  amount: number;
  status: "pending" | "paid" | "refunded";
  provider?: "razorpay" | "stripe" | "mock";
  orderId?: string; // gateway order id (if any)
  transactionId?: string; // gateway payment id (if any)
  invoiceUrl?: string; // PDF url (optional, for future)
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    rideEventId: {
      type: Schema.Types.ObjectId,
      ref: "RideEvent",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
      index: true,
    },
    provider: {
      type: String,
      enum: ["razorpay", "stripe", "mock"],
      default: "mock",
    },
    orderId: {
      type: String,
      default: null,
    },
    transactionId: {
      type: String,
      default: null,
    },
    invoiceUrl: {
      type: String,
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "payments",
  }
);

paymentSchema.index({ userId: 1, rideEventId: 1 });

const Payment = mongoose.model<IPayment>("Payment", paymentSchema);
export default Payment;







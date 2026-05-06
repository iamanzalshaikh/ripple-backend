import mongoose, { Schema, Document } from "mongoose";

export interface IAuditLog extends Document {
  adminId: mongoose.Types.ObjectId;
  action: string; // e.g., "USER_SUSPENDED", "POST_DELETED", "RIDE_CANCELLED"
  targetType: "USER" | "POST" | "RIDE" | "LISTING" | "BRAND" | "EVENT";
  targetId: mongoose.Types.ObjectId;
  details: string; // Human readable description
  metadata: any; // Extra context like IP, old state, new state
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    action: { type: String, required: true },
    targetType: { 
      type: String, 
      enum: ["USER", "POST", "RIDE", "LISTING", "BRAND", "EVENT"],
      required: true 
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    details: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Index for fast searching
AuditLogSchema.index({ adminId: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

export default mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

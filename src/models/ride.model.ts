import mongoose, { Document, Schema } from "mongoose";

interface IRide extends Document {
  userId: mongoose.Types.ObjectId;
  bikeId?: mongoose.Types.ObjectId;
  distance: number;
  duration: number;
  avgSpeed: number;
  maxSpeed: number;
  simplifiedPolyline: Array<{ lat: number; lng: number }>;
  startedAt: Date;
  endedAt?: Date;
  privacy: "private" | "friends" | "public";
  liveShareEnabled: boolean;
  liveShareToken?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  aiScore?: number;
  aiFeedback?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const rideSchema = new Schema<IRide>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bikeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bike",
    },
    distance: {
      type: Number,
      default: 0,
      description: "Distance in meters",
    },
    duration: {
      type: Number,
      default: 0,
      description: "Duration in seconds",
    },
    avgSpeed: {
      type: Number,
      default: 0,
      description: "Average speed in km/h",
    },
    maxSpeed: {
      type: Number,
      default: 0,
      description: "Maximum speed in km/h",
    },
    simplifiedPolyline: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        _id: false,
      },
    ],
    startedAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
      index: true,
    },
    privacy: {
      type: String,
      enum: ["private", "friends", "public"],
      default: "friends",
    },
    liveShareEnabled: {
      type: Boolean,
      default: false,
    },
    liveShareToken: {
      type: String,
      unique: true,
      sparse: true,
      description: "Token for public live tracking",
    },
    status: {
      type: String,
      enum: ["active", "paused", "completed", "cancelled"],
      default: "active",
      index: true,
    },
    aiScore: {
      type: Number,
      min: 0,
      max: 100,
      description: "AI Coach score (0-100)",
    },
    aiFeedback: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true },
);

// Indexes for common queries
rideSchema.index({ userId: 1, startedAt: -1 });
rideSchema.index({ userId: 1, status: 1 });
rideSchema.index({ liveShareToken: 1 });
rideSchema.index({ status: 1, endedAt: 1 });

export default mongoose.model<IRide>("Ride", rideSchema);

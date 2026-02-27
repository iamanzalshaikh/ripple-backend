import mongoose, { Document, Schema } from "mongoose";

interface IParticipant {
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
}

export interface IGroupRide extends Document {
  creatorId: mongoose.Types.ObjectId;
  joinCode: string;
  participants: IParticipant[];
  status: "waiting" | "active" | "ended";
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const participantSchema = new Schema<IParticipant>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    joinedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false },
);

const groupRideSchema = new Schema<IGroupRide>(
  {
    creatorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 6,
    },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ["waiting", "active", "ended"],
      default: "waiting",
      index: true,
    },
    startedAt: {
      type: Date,
    },
    endedAt: {
      type: Date,
    },
  },
  { timestamps: true },
);

// Compound indexes for common queries
groupRideSchema.index({ joinCode: 1 }, { unique: true });
groupRideSchema.index({ status: 1 });
groupRideSchema.index({ creatorId: 1, status: 1 });

export default mongoose.model<IGroupRide>("GroupRide", groupRideSchema);

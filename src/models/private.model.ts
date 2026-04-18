import mongoose, { Schema, Document } from "mongoose";

export interface IPrivateChatRoom extends Document {
  _id: mongoose.Types.ObjectId;
  roomId: string; // user1_user2 format (sorted)
  user1: mongoose.Types.ObjectId;
  user2: mongoose.Types.ObjectId;
  context?: "marketplace" | "mentor" | "general" | "post";
  contextId?: mongoose.Types.ObjectId; // listing / mentor / post reference
  // Product context (for marketplace listings)
  productTitle?: string;
  productImage?: string;
  productPrice?: number;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadCount?: Map<string, number>; // { userId: unreadCount }
  createdAt: Date;
  updatedAt: Date;
}

const PrivateChatRoomSchema = new Schema<IPrivateChatRoom>(
  {
    roomId: {
      type: String,
      unique: true,
      index: true,
      required: true,
    },
    user1: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    user2: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    context: {
      type: String,
      enum: ["marketplace", "mentor", "general", "post"],
      default: "general",
    },
    contextId: {
      type: Schema.Types.ObjectId,
      sparse: true,
    },
    // Product context (cached for quick access)
    productTitle: {
      type: String,
      sparse: true,
    },
    productImage: {
      type: String,
      sparse: true,
    },
    productPrice: {
      type: Number,
      sparse: true,
    },
    lastMessage: String,
    lastMessageAt: Date,
    unreadCount: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

PrivateChatRoomSchema.index({ user1: 1, user2: 1 });
PrivateChatRoomSchema.index({ roomId: 1 });

export default mongoose.model<IPrivateChatRoom>(
  "PrivateChatRoom",
  PrivateChatRoomSchema
);

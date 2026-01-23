// import mongoose, { Schema, Document } from 'mongoose';

// export interface IChatMessage extends Document {
//   // Room identification (one of these required)
//   rideEventId?: mongoose.Types.ObjectId;  // Event chat
//   groupId?: mongoose.Types.ObjectId;       // Group chat
//   privateRoomId?: string;                 // Private 1:1 (roomId format: "user1_user2")

//   roomType: 'event' | 'group' | 'private';
//   senderId: mongoose.Types.ObjectId;
//   receiverId?: mongoose.Types.ObjectId;    // For private chats
//   text: string;
//   media?: string[];
//   timestamp: Date;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const chatMessageSchema = new Schema<IChatMessage>(
//   {
//     // Room identification (one required)
//     rideEventId: {
//       type: Schema.Types.ObjectId,
//       ref: 'RideEvent',
//       index: true,
//       sparse: true
//     },
//     groupId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Group',
//       index: true,
//       sparse: true
//     },
//     privateRoomId: {
//       type: String,
//       index: true,
//       sparse: true
//     },

//     roomType: {
//       type: String,
//       enum: ['event', 'group', 'private'],
//       required: true,
//       index: true
//     },

//     senderId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       index: true
//     },

//     receiverId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       index: true,
//       sparse: true
//     },

//     text: {
//       type: String,
//       required: true,
//       maxlength: 500,
//       trim: true
//     },
//     media: [String],
//     timestamp: { type: Date, default: Date.now, index: true }
//   },
//   { timestamps: true, collection: 'chat_messages' }
// );

// // Indexes for different room types
// chatMessageSchema.index({ rideEventId: 1, timestamp: -1 });
// chatMessageSchema.index({ groupId: 1, timestamp: -1 });
// chatMessageSchema.index({ privateRoomId: 1, timestamp: -1 });
// chatMessageSchema.index({ roomType: 1, timestamp: -1 });

// // Validation: At least one room identifier must be present
// chatMessageSchema.pre('save', function(next) {
//   if (!this.rideEventId && !this.groupId && !this.privateRoomId) {
//     return next(new Error('At least one room identifier (rideEventId, groupId, or privateRoomId) is required'));
//   }
//   next();
// });

// const ChatMessage = mongoose.model<IChatMessage>('ChatMessage', chatMessageSchema);
// export default ChatMessage;

import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage extends Document {
  // Room identification (one of these required)
  rideEventId?: mongoose.Types.ObjectId; // Ride event chat
  groupId?: mongoose.Types.ObjectId; // Group chat
  privateRoomId?: string; // Private 1:1 (roomId format: "user1_user2")

  roomType: "ride" | "group" | "private" | "event";
  senderId: mongoose.Types.ObjectId;
  receiverId?: mongoose.Types.ObjectId; // For private chats
  text: string;
  media?: string[];
  messageType?: "text" | "product_card"; // Message type
  productData?: {
    listingId: string;
    title: string;
    image?: string;
    price: number;
  };
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessage>(
  {
    // Room identification (one required)
    rideEventId: {
      type: Schema.Types.ObjectId,
      ref: "RideEvent",
      index: true,
      sparse: true,
    },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      index: true,
      sparse: true,
    },
    privateRoomId: {
      type: String,
      index: true,
      sparse: true,
    },

    roomType: {
      type: String,
      enum: ["ride", "group", "private"],
      required: true,
      index: true,
    },

    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
      sparse: true,
    },

    text: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true,
    },
    media: [String],
    messageType: {
      type: String,
      enum: ["text", "product_card"],
      default: "text",
    },
    productData: {
      type: {
        listingId: String,
        title: String,
        image: String,
        price: Number,
      },
      _id: false,
    },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true, collection: "chat_messages" }
);

// Indexes for different room types
chatMessageSchema.index({ rideEventId: 1, timestamp: -1 });
chatMessageSchema.index({ groupId: 1, timestamp: -1 });
chatMessageSchema.index({ privateRoomId: 1, timestamp: -1 });
chatMessageSchema.index({ roomType: 1, timestamp: -1 });

// Validation: At least one room identifier must be present
chatMessageSchema.pre("save", function (next) {
  if (!this.rideEventId && !this.groupId && !this.privateRoomId) {
    return next(
      new Error(
        "At least one room identifier (rideEventId, groupId, or privateRoomId) is required"
      )
    );
  }
  next();
});

const ChatMessage = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema
);
export default ChatMessage;

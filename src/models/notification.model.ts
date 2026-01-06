// ==========================================
// File: src/models/notification.model.ts
// ==========================================
import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'like' | 'comment' | 'follow' | 'ride' | 'event' | 'group' | 'mentor' | 'ride_share';
  fromUserId?: mongoose.Types.ObjectId;
  fromUserName?: string;
  postId?: mongoose.Types.ObjectId;
  commentId?: mongoose.Types.ObjectId;
  commentText?: string; // Store actual comment text for better UX
  rideEventId?: mongoose.Types.ObjectId;
  groupId?: mongoose.Types.ObjectId;
  message: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ['like', 'comment', 'follow', 'ride', 'event', 'group', 'mentor', 'ride_share'],
      required: true
    },

    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },

    fromUserName: {
      type: String,
      sparse: true
    },

    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      sparse: true
    },

    commentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      sparse: true
    },

    commentText: {
      type: String,
      maxlength: 500,
      sparse: true
    },

    rideEventId: {
      type: Schema.Types.ObjectId,
      ref: 'RideEvent',
      sparse: true
    },

    groupId: {
      type: Schema.Types.ObjectId,
      ref: 'Group',
      sparse: true
    },

    message: {
      type: String,
      maxlength: 500,
      required: true
    },

    read: {
      type: Boolean,
      default: false,
      index: true
    },

    readAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'notifications'
  }
);

// ==================== INDEXES ====================
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;

// ==========================================
// File: src/models/comment.model.ts (FIXED)
// ==========================================
import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  // If present, this comment is a reply to another top-level comment.
  parentCommentId?: mongoose.Types.ObjectId | null;
  text: string;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    postId: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    parentCommentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      required: false,
      default: null,
      index: true,
    },

    text: {
      type: String,
      required: true,
      maxlength: 1000,
      minlength: 1
    }
  },
  {
    timestamps: true,
    collection: 'comments'
  }
);

// ==================== INDEXES ====================
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });

const Comment = mongoose.model<IComment>('Comment', commentSchema);
export default Comment;

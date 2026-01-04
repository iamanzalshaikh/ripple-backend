// ==========================================
// File: src/models/comment.model.ts (FIXED)
// ==========================================
import mongoose, { Schema } from 'mongoose';
const commentSchema = new Schema({
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
    text: {
        type: String,
        required: true,
        maxlength: 1000,
        minlength: 1
    }
}, {
    timestamps: true,
    collection: 'comments'
});
// ==================== INDEXES ====================
commentSchema.index({ postId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, createdAt: -1 });
const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
//# sourceMappingURL=comment.model.js.map
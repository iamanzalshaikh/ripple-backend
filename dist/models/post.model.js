// ==========================================
// File: src/models/post.model.ts (FIXED)
// ==========================================
import mongoose, { Schema } from 'mongoose';
const postSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    caption: {
        type: String,
        maxlength: 2000,
        default: ''
    },
    media: [
        {
            url: {
                type: String,
                required: true
            },
            type: {
                type: String,
                enum: ['photo', 'video'],
                required: true
            }
        }
    ],
    rideId: {
        type: Schema.Types.ObjectId,
        ref: 'Ride',
        sparse: true
    },
    location: {
        lat: {
            type: Number,
            min: -90,
            max: 90
        },
        lng: {
            type: Number,
            min: -180,
            max: 180
        },
        name: String
    },
    likes: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    likeCount: {
        type: Number,
        default: 0,
        index: true
    },
    comments: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Comment'
        }
    ],
    commentCount: {
        type: Number,
        default: 0
    },
    privacy: {
        type: String,
        enum: ['private', 'friends', 'public'],
        default: 'friends'
    }
}, {
    timestamps: true,
    collection: 'posts'
});
// ==================== INDEXES ====================
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ rideId: 1 });
postSchema.index({ likeCount: -1 });
postSchema.index({ userId: 1, privacy: 1 });
const Post = mongoose.model('Post', postSchema);
export default Post;
//# sourceMappingURL=post.model.js.map
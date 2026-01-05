import mongoose, { Schema } from 'mongoose';
const GroupSchema = new Schema({
    name: {
        type: String,
        required: true,
        index: true
    },
    description: String,
    location: String,
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            role: {
                type: String,
                enum: ['admin', 'member'],
                default: 'member'
            },
            joinedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    joinRequests: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            requestedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    privacy: {
        type: String,
        enum: ['public', 'private', 'friends'],
        default: 'public'
    },
    avatarUrl: String,
    tags: [String],
    stats: {
        totalRides: { type: Number, default: 0 },
        totalMembers: { type: Number, default: 0 }
    },
    chatRoomId: {
        type: String,
        unique: true,
        sparse: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });
GroupSchema.index({ name: 'text', description: 'text', tags: 'text' });
export default mongoose.model('Group', GroupSchema);
//# sourceMappingURL=group.model.js.map
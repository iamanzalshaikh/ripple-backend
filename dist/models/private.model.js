import mongoose, { Schema } from 'mongoose';
const PrivateChatRoomSchema = new Schema({
    roomId: {
        type: String,
        unique: true,
        index: true,
        required: true
    },
    user1: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user2: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    context: {
        type: String,
        enum: ['marketplace', 'mentor', 'general'],
        default: 'general'
    },
    contextId: {
        type: Schema.Types.ObjectId,
        sparse: true
    },
    lastMessage: String,
    lastMessageAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });
PrivateChatRoomSchema.index({ user1: 1, user2: 1 });
PrivateChatRoomSchema.index({ roomId: 1 });
export default mongoose.model('PrivateChatRoom', PrivateChatRoomSchema);
//# sourceMappingURL=private.model.js.map
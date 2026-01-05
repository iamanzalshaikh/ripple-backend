import mongoose, { Document } from 'mongoose';
export interface IPrivateChatRoom extends Document {
    _id: mongoose.Types.ObjectId;
    roomId: string;
    user1: mongoose.Types.ObjectId;
    user2: mongoose.Types.ObjectId;
    context?: 'marketplace' | 'mentor' | 'general';
    contextId?: mongoose.Types.ObjectId;
    lastMessage?: string;
    lastMessageAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IPrivateChatRoom, {}, {}, {}, mongoose.Document<unknown, {}, IPrivateChatRoom, {}, {}> & IPrivateChatRoom & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=private.model.d.ts.map
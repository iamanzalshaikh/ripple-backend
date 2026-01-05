import mongoose, { Document } from 'mongoose';
export interface IChatMessage extends Document {
    rideEventId?: mongoose.Types.ObjectId;
    groupId?: mongoose.Types.ObjectId;
    privateRoomId?: string;
    roomType: 'ride' | 'group' | 'private';
    senderId: mongoose.Types.ObjectId;
    receiverId?: mongoose.Types.ObjectId;
    text: string;
    media?: string[];
    timestamp: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const ChatMessage: mongoose.Model<IChatMessage, {}, {}, {}, mongoose.Document<unknown, {}, IChatMessage, {}, {}> & IChatMessage & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default ChatMessage;
//# sourceMappingURL=chatMessage.model.d.ts.map
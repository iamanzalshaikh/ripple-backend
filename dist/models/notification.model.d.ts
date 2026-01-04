import mongoose, { Document } from 'mongoose';
export interface INotification extends Document {
    userId: mongoose.Types.ObjectId;
    type: 'like' | 'comment' | 'follow' | 'ride_share';
    fromUserId?: mongoose.Types.ObjectId;
    postId?: mongoose.Types.ObjectId;
    commentId?: mongoose.Types.ObjectId;
    message: string;
    read: boolean;
    readAt?: Date;
    createdAt: Date;
    updatedAt?: Date;
}
declare const Notification: mongoose.Model<INotification, {}, {}, {}, mongoose.Document<unknown, {}, INotification, {}, {}> & INotification & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Notification;
//# sourceMappingURL=notification.model.d.ts.map
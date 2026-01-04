import mongoose, { Document } from 'mongoose';
export interface IComment extends Document {
    postId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    text: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const Comment: mongoose.Model<IComment, {}, {}, {}, mongoose.Document<unknown, {}, IComment, {}, {}> & IComment & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Comment;
//# sourceMappingURL=comment.model.d.ts.map
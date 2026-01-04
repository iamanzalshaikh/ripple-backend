import mongoose, { Document } from 'mongoose';
export interface IPost extends Document {
    userId: mongoose.Types.ObjectId;
    caption: string;
    media: Array<{
        url: string;
        type: 'photo' | 'video';
    }>;
    rideId?: mongoose.Types.ObjectId;
    location?: {
        lat: number;
        lng: number;
        name?: string;
    };
    likes: mongoose.Types.ObjectId[];
    likeCount: number;
    comments: mongoose.Types.ObjectId[];
    commentCount: number;
    privacy: 'private' | 'friends' | 'public';
    createdAt: Date;
    updatedAt: Date;
}
declare const Post: mongoose.Model<IPost, {}, {}, {}, mongoose.Document<unknown, {}, IPost, {}, {}> & IPost & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default Post;
//# sourceMappingURL=post.model.d.ts.map
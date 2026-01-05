import mongoose, { Document } from 'mongoose';
export interface IGroup extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    location: string;
    createdBy: mongoose.Types.ObjectId;
    members: {
        userId: mongoose.Types.ObjectId;
        role: 'admin' | 'member';
        joinedAt: Date;
    }[];
    joinRequests: {
        userId: mongoose.Types.ObjectId;
        requestedAt: Date;
    }[];
    privacy: 'public' | 'private' | 'friends';
    avatarUrl?: string;
    tags: string[];
    stats: {
        totalRides: number;
        totalMembers: number;
    };
    chatRoomId: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IGroup, {}, {}, {}, mongoose.Document<unknown, {}, IGroup, {}, {}> & IGroup & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=group.model.d.ts.map
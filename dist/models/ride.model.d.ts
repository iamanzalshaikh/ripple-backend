import mongoose, { Document } from 'mongoose';
interface IRide extends Document {
    userId: mongoose.Types.ObjectId;
    bikeId?: mongoose.Types.ObjectId;
    distance: number;
    duration: number;
    avgSpeed: number;
    maxSpeed: number;
    simplifiedPolyline: Array<{
        lat: number;
        lng: number;
    }>;
    startedAt: Date;
    endedAt?: Date;
    privacy: 'private' | 'friends' | 'public';
    liveShareEnabled: boolean;
    liveShareToken?: string;
    status: 'active' | 'paused' | 'completed';
    aiScore?: number;
    aiFeedback?: string[];
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IRide, {}, {}, {}, mongoose.Document<unknown, {}, IRide, {}, {}> & IRide & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ride.model.d.ts.map
import mongoose, { Document } from 'mongoose';
export interface IRideEvent extends Document {
    title: string;
    description?: string;
    organizerId: mongoose.Types.ObjectId;
    route: {
        startPoint: {
            type: 'Point';
            coordinates: [number, number];
        };
        endPoint: {
            type: 'Point';
            coordinates: [number, number];
        };
        waypoints?: Array<{
            type: 'Point';
            coordinates: [number, number];
            name?: string;
        }>;
        polyline: Array<{
            lat: number;
            lng: number;
        }>;
        distance: number;
        estimatedDuration: number;
        elevation?: number;
        difficulty: 'beginner' | 'intermediate' | 'advanced';
    };
    scheduledAt: Date;
    timezone: string;
    rules: string[];
    minRidingHours: number;
    bikeTypes?: string[];
    maxParticipants: number;
    participants: Array<{
        userId: mongoose.Types.ObjectId;
        status: 'rsvp' | 'joined' | 'completed' | 'cancelled';
        joinedAt: Date;
        leftAt?: Date;
        bikeId?: mongoose.Types.ObjectId;
    }>;
    status: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
    liveStartedAt?: Date;
    liveEndedAt?: Date;
    safetyLevel: 'low' | 'medium' | 'high';
    badgeRewards?: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}
declare const RideEvent: mongoose.Model<IRideEvent, {}, {}, {}, mongoose.Document<unknown, {}, IRideEvent, {}, {}> & IRideEvent & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default RideEvent;
//# sourceMappingURL=rideEvent.model.d.ts.map
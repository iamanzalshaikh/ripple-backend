import mongoose, { Document } from 'mongoose';
export interface IRideEventParticipant extends Document {
    rideEventId: mongoose.Types.ObjectId;
    userId: mongoose.Types.ObjectId;
    bikeId: mongoose.Types.ObjectId;
    distance?: number;
    duration?: number;
    maxSpeed?: number;
    avgSpeed?: number;
    finishedRide: boolean;
    droppedOutAt?: Date;
    crashDetected: boolean;
    sosTriggered: boolean;
    riderRating?: number;
    feedback?: string;
    ratedBy?: mongoose.Types.ObjectId;
    ratedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
declare const RideEventParticipant: mongoose.Model<IRideEventParticipant, {}, {}, {}, mongoose.Document<unknown, {}, IRideEventParticipant, {}, {}> & IRideEventParticipant & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default RideEventParticipant;
//# sourceMappingURL=rideEventParticipant.model.d.ts.map
import mongoose, { Document } from 'mongoose';
interface ITelemetry extends Document {
    rideId: mongoose.Types.ObjectId;
    chunkIndex: number;
    points: Array<{
        timestamp: number;
        lat: number;
        lng: number;
        speed: number;
        accuracy: number;
        bearing: number;
        accel: {
            x: number;
            y: number;
            z: number;
        };
    }>;
    createdAt: Date;
}
declare const _default: mongoose.Model<ITelemetry, {}, {}, {}, mongoose.Document<unknown, {}, ITelemetry, {}, {}> & ITelemetry & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=ridetelemetry.model.d.ts.map
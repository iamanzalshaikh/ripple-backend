import mongoose, { Document } from 'mongoose';
/**
 * ✅ LOCATION HISTORY
 * Tracks all location updates during SOS
 */
interface ILocationHistory {
    lat: number;
    lng: number;
    accuracy?: number;
    timestamp: Date;
}
/**
 * ✅ SOS Alert Record
 * Stores info about each alert sent
 */
interface ISOSAlert {
    contactId: mongoose.Types.ObjectId;
    channel: 'email';
    sentAt: Date;
    delivered: boolean;
    acknowledged: boolean;
}
/**
 * ✅ SOS Log Document
 * Main SOS record - tracks everything about the emergency
 */
interface ISOSLog extends Document {
    userId: mongoose.Types.ObjectId;
    rideId?: mongoose.Types.ObjectId;
    triggerType: 'manual' | 'crash_detection';
    triggeredAt: Date;
    location: {
        lat: number;
        lng: number;
        accuracy?: number;
    };
    locationHistory: ILocationHistory[];
    lastLocationUpdate?: Date;
    resolvedAt?: Date;
    status: 'active' | 'resolved' | 'false_positive';
    liveShareToken: string;
    alerts: ISOSAlert[];
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}
declare const SOSLog: mongoose.Model<ISOSLog, {}, {}, {}, mongoose.Document<unknown, {}, ISOSLog, {}, {}> & ISOSLog & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default SOSLog;
export type { ISOSLog, ISOSAlert, ILocationHistory };
//# sourceMappingURL=soslog.model.d.ts.map
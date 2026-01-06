// import mongoose, { Schema, Document } from 'mongoose';

// export interface IRideEventParticipant extends Document {
//   rideEventId: mongoose.Types.ObjectId;
//   userId: mongoose.Types.ObjectId;
//   bikeId: mongoose.Types.ObjectId;
//   distance?: number;
//   duration?: number;
//   maxSpeed?: number;
//   avgSpeed?: number;
//   finishedRide: boolean;
//   droppedOutAt?: Date;
//   crashDetected: boolean;
//   sosTriggered: boolean;
//   riderRating?: number;
//   feedback?: string;
//   ratedBy?: mongoose.Types.ObjectId;
//   ratedAt?: Date;
//   createdAt: Date;
//   updatedAt: Date;
// }

// const rideEventParticipantSchema = new Schema<IRideEventParticipant>(
//   {
//     rideEventId: {
//       type: Schema.Types.ObjectId,
//       ref: 'RideEvent',
//       required: true,
//       index: true
//     },
//     userId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       index: true
//     },
//     bikeId: {
//       type: Schema.Types.ObjectId,
//       ref: 'Bike',
//       required: true
//     },
//     distance: { type: Number, default: 0 },
//     duration: { type: Number, default: 0 },
//     maxSpeed: { type: Number, default: 0 },
//     avgSpeed: { type: Number, default: 0 },
//     finishedRide: { type: Boolean, default: false },
//     droppedOutAt: Date,
//     crashDetected: { type: Boolean, default: false },
//     sosTriggered: { type: Boolean, default: false },
//     riderRating: { type: Number, min: 1, max: 5 },
//     feedback: String,
//     ratedBy: { type: Schema.Types.ObjectId, ref: 'User' },
//     ratedAt: Date
//   },
//   { timestamps: true, collection: 'ride_event_participants' }
// );

// rideEventParticipantSchema.index({ rideEventId: 1, userId: 1 }, { unique: true });
// rideEventParticipantSchema.index({ userId: 1, finishedRide: 1 });

// const RideEventParticipant = mongoose.model<IRideEventParticipant>(
//   'RideEventParticipant',
//   rideEventParticipantSchema
// );
// export default RideEventParticipant;



import mongoose, { Schema, Document } from 'mongoose';

export interface IRideEventParticipant extends Document {
  rideEventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  bikeId: mongoose.Types.ObjectId;
  status: 'JOINED' | 'ACTIVE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
  joinedAt: Date;
  personalStartTime?: Date;
  personalEndTime?: Date;
  distance?: number;
  duration?: number;
  maxSpeed?: number;
  avgSpeed?: number;
  elevation?: number;
  calories?: number;
  finishedRide: boolean;
  droppedOutAt?: Date;
  crashDetected: boolean;
  sosTriggered: boolean;
  liveLocationEnabled?: boolean;
  sosEnabled?: boolean;
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    notifiedAt?: Date;
  }>;
  wasLateJoin?: boolean;
  lateJoinReason?: string;
  isNoShow?: boolean;
  noShowReason?: string;
  riderRating?: number;
  feedback?: string;
  ratedBy?: mongoose.Types.ObjectId;
  ratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const rideEventParticipantSchema = new Schema<IRideEventParticipant>(
  {
    rideEventId: {
      type: Schema.Types.ObjectId,
      ref: 'RideEvent',
      required: true,
      index: true
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    bikeId: {
      type: Schema.Types.ObjectId,
      ref: 'Bike',
      required: true
    },
    // Status - NEW
    status: {
      type: String,
      enum: ['JOINED', 'ACTIVE', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
      default: 'JOINED'
    },
    joinedAt: { type: Date, default: Date.now },
    // Personal tracking times - NEW
    personalStartTime: { type: Date, default: null },
    personalEndTime: { type: Date, default: null },
    // Ride stats
    distance: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    maxSpeed: { type: Number, default: 0 },
    avgSpeed: { type: Number, default: 0 },
    elevation: { type: Number, default: 0 },
    calories: { type: Number, default: 0 },
    // Existing fields
    finishedRide: { type: Boolean, default: false },
    droppedOutAt: Date,
    crashDetected: { type: Boolean, default: false },
    sosTriggered: { type: Boolean, default: false },
    // Safety features - NEW
    liveLocationEnabled: { type: Boolean, default: false },
    sosEnabled: { type: Boolean, default: false },
    emergencyContacts: [
      {
        name: String,
        phone: String,
        notifiedAt: { type: Date, default: null },
        _id: false
      }
    ],
    // Late join tracking - NEW
    wasLateJoin: { type: Boolean, default: false },
    lateJoinReason: String,
    // No show tracking - NEW
    isNoShow: { type: Boolean, default: false },
    noShowReason: String,
    // Ratings
    riderRating: { type: Number, min: 1, max: 5 },
    feedback: String,
    ratedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ratedAt: Date
  },
  { timestamps: true, collection: 'ride_event_participants' }
);

rideEventParticipantSchema.index(
  { rideEventId: 1, userId: 1 },
  { unique: true }
);
rideEventParticipantSchema.index({ userId: 1, finishedRide: 1 });

const RideEventParticipant = mongoose.model<IRideEventParticipant>(
  'RideEventParticipant',
  rideEventParticipantSchema
);
export default RideEventParticipant;
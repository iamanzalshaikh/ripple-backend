import mongoose, { Schema, Document } from 'mongoose';

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
    distance: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    maxSpeed: { type: Number, default: 0 },
    avgSpeed: { type: Number, default: 0 },
    finishedRide: { type: Boolean, default: false },
    droppedOutAt: Date,
    crashDetected: { type: Boolean, default: false },
    sosTriggered: { type: Boolean, default: false },
    riderRating: { type: Number, min: 1, max: 5 },
    feedback: String,
    ratedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ratedAt: Date
  },
  { timestamps: true, collection: 'ride_event_participants' }
);

rideEventParticipantSchema.index({ rideEventId: 1, userId: 1 }, { unique: true });
rideEventParticipantSchema.index({ userId: 1, finishedRide: 1 });

const RideEventParticipant = mongoose.model<IRideEventParticipant>(
  'RideEventParticipant',
  rideEventParticipantSchema
);
export default RideEventParticipant;
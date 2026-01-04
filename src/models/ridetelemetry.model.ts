import mongoose, { Document, Schema } from 'mongoose';

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
  
  const telemetrySchema = new Schema<ITelemetry>(
    {
      rideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ride',
        required: true,
        index: true
      },
      chunkIndex: {
        type: Number,
        required: true,
        description: 'Sequential chunk number'
      },
      points: [
        {
          timestamp: { type: Number, required: true },
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
          speed: { type: Number, default: 0, description: 'm/s' },
          accuracy: { type: Number, default: 10, description: 'meters' },
          bearing: { type: Number, default: 0, description: 'degrees' },
          accel: {
            x: { type: Number, default: 0 },
            y: { type: Number, default: 0 },
            z: { type: Number, default: 0 },
            _id: false
          },
          _id: false
        }
      ]
    },
    { timestamps: true }
  );
  
  // TTL Index: Auto-delete after 7 days
  telemetrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });
  telemetrySchema.index({ rideId: 1, chunkIndex: 1 });
  
  export default mongoose.model<ITelemetry>('RideTelemetry', telemetrySchema);

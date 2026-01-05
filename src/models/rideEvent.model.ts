import mongoose, { Schema, Document } from 'mongoose';

export interface IRideEvent extends Document {
  title: string;
  description?: string;
  organizerId: mongoose.Types.ObjectId;
  route: {
    startPoint: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
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
    polyline: Array<{ lat: number; lng: number }>;
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

const rideEventSchema = new Schema<IRideEvent>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true
    },
    description: {
      type: String,
      maxlength: 1000
    },
    organizerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    
    // Route details
    route: {
      startPoint: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
          default: 'Point'
        },
        coordinates: {
          type: [Number], // [lng, lat]
          required: true,
          validate: {
            validator: function(v: number[]) {
              return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
            },
            message: 'Coordinates must be [longitude, latitude] with valid ranges'
          }
        }
      },
      endPoint: {
        type: {
          type: String,
          enum: ['Point'],
          required: true,
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          required: true,
          validate: {
            validator: function(v: number[]) {
              return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
            },
            message: 'Coordinates must be [longitude, latitude] with valid ranges'
          }
        }
      },
      waypoints: [
        {
          type: {
            type: String,
            enum: ['Point'],
            required: true,
            default: 'Point'
          },
          coordinates: {
            type: [Number],
            required: true
          },
          name: String,
          _id: false
        }
      ],
      polyline: [
        {
          lat: { type: Number, required: true },
          lng: { type: Number, required: true },
          _id: false
        }
      ],
      distance: { type: Number, required: true },
      estimatedDuration: { type: Number, required: true },
      elevation: { type: Number },
      difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'intermediate'
      }
    },
    
    // Schedule
    scheduledAt: { type: Date, required: true, index: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    
    // Rules & Requirements
    rules: [{ type: String, default: 'Helmet mandatory' }],
    minRidingHours: { type: Number, default: 0 },
    bikeTypes: [String],
    maxParticipants: {
      type: Number,
      default: 50,
      min: 2,
      max: 200
    },
    
    // Participants
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
          type: String,
          enum: ['rsvp', 'joined', 'completed', 'cancelled'],
          default: 'rsvp'
        },
        joinedAt: { type: Date, default: Date.now },
        leftAt: Date,
        bikeId: { type: Schema.Types.ObjectId, ref: 'Bike' },
        _id: false
      }
    ],
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'live', 'completed', 'cancelled'],
      default: 'draft',
      index: true
    },
    liveStartedAt: Date,
    liveEndedAt: Date,
    
    // Safety & Engagement
    safetyLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'high'
    },
    badgeRewards: [{ type: Schema.Types.ObjectId, ref: 'Badge' }]
  },
  { timestamps: true, collection: 'ride_events' }
);

// Geospatial index on startPoint
rideEventSchema.index({ 'route.startPoint': '2dsphere' });
rideEventSchema.index({ organizerId: 1, status: 1 });
rideEventSchema.index({ scheduledAt: 1, status: 1 });
rideEventSchema.index({ 'participants.userId': 1 });

const RideEvent = mongoose.model<IRideEvent>('RideEvent', rideEventSchema);
export default RideEvent;





import mongoose, { Schema, Document } from 'mongoose';

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
  locationHistory: ILocationHistory[];       // ✅ NEW
  lastLocationUpdate?: Date;                 // ✅ NEW
  resolvedAt?: Date;
  status: 'active' | 'resolved' | 'false_positive';
  liveShareToken: string;
  alerts: ISOSAlert[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Location History Schema
// ============================================
const locationHistorySchema = new Schema<ILocationHistory>(
  {
    lat: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    lng: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    accuracy: Number,
    timestamp: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false }
);

// ============================================
// SOS Alert Schema
// ============================================
const sosAlertSchema = new Schema<ISOSAlert>(
  {
    contactId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: String,
      enum: ['email'],
      default: 'email',
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    delivered: {
      type: Boolean,
      default: false,
    },
    acknowledged: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// ============================================
// SOS Log Schema
// ============================================
const sosLogSchema = new Schema<ISOSLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    rideId: {
      type: Schema.Types.ObjectId,
      ref: 'Ride',
    },

    triggerType: {
      type: String,
      enum: ['manual', 'crash_detection'],
      required: true,
      default: 'manual',
    },

    triggeredAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    location: {
      lat: {
        type: Number,
        required: true,
        min: -90,
        max: 90,
      },
      lng: {
        type: Number,
        required: true,
        min: -180,
        max: 180,
      },
      accuracy: Number,
    },

    // ✅ LOCATION HISTORY (NEW)
    locationHistory: {
      type: [locationHistorySchema],
      default: [],
    },

    // ✅ LAST LOCATION UPDATE TIME (NEW)
    lastLocationUpdate: {
        type: Date,
        default: () => new Date(), // Now sets to current time
      },
  
      resolvedAt: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'false_positive'],
      default: 'active',
      index: true,
    },

    liveShareToken: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
      index: true,
    },

    alerts: [sosAlertSchema],

    notes: String,
  },
  {
    timestamps: true,
    collection: 'sos_logs',
  }
);

// ============================================
// Indexes
// ============================================
// Auto-expire SOS logs after 30 days
sosLogSchema.index(
  { triggeredAt: 1 },
  { expireAfterSeconds: 30 * 24 * 3600 }
);

// Index for user SOS history
sosLogSchema.index(
  { userId: 1, status: 1, triggeredAt: -1 }
);

const SOSLog = mongoose.model<ISOSLog>('SOSLog', sosLogSchema);

export default SOSLog;
export type { ISOSLog, ISOSAlert, ILocationHistory };

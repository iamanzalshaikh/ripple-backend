// import mongoose, { Schema, Document } from 'mongoose';

// export interface IRideEvent extends Document {
//   title: string;
//   description?: string;
//   organizerId: mongoose.Types.ObjectId;
//   route: {
//     startPoint: {
//       type: 'Point';
//       coordinates: [number, number]; // [lng, lat]
//     };
//     endPoint: {
//       type: 'Point';
//       coordinates: [number, number];
//     };
//     waypoints?: Array<{
//       type: 'Point';
//       coordinates: [number, number];
//       name?: string;
//     }>;
//     polyline: Array<{ lat: number; lng: number }>;
//     distance: number;
//     estimatedDuration: number;
//     elevation?: number;
//     difficulty: 'beginner' | 'intermediate' | 'advanced';
//   };
//   scheduledAt: Date;
//   timezone: string;
//   rules: string[];
//   minRidingHours: number;
//   bikeTypes?: string[];
//   maxParticipants: number;
//   participants: Array<{
//     userId: mongoose.Types.ObjectId;
//     status: 'rsvp' | 'joined' | 'completed' | 'cancelled';
//     joinedAt: Date;
//     leftAt?: Date;
//     bikeId?: mongoose.Types.ObjectId;
//   }>;
//   status: 'draft' | 'scheduled' | 'live' | 'completed' | 'cancelled';
//   liveStartedAt?: Date;
//   liveEndedAt?: Date;
//   safetyLevel: 'low' | 'medium' | 'high';
//   badgeRewards?: mongoose.Types.ObjectId[];
//   createdAt: Date;
//   updatedAt: Date;
// }

// const rideEventSchema = new Schema<IRideEvent>(
//   {
//     title: {
//       type: String,
//       required: true,
//       trim: true,
//       maxlength: 100,
//       index: true
//     },
//     description: {
//       type: String,
//       maxlength: 1000
//     },
//     organizerId: {
//       type: Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//       index: true
//     },
    
//     // Route details
//     route: {
//       startPoint: {
//         type: {
//           type: String,
//           enum: ['Point'],
//           required: true,
//           default: 'Point'
//         },
//         coordinates: {
//           type: [Number], // [lng, lat]
//           required: true,
//           validate: {
//             validator: function(v: number[]) {
//               return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
//             },
//             message: 'Coordinates must be [longitude, latitude] with valid ranges'
//           }
//         }
//       },
//       endPoint: {
//         type: {
//           type: String,
//           enum: ['Point'],
//           required: true,
//           default: 'Point'
//         },
//         coordinates: {
//           type: [Number],
//           required: true,
//           validate: {
//             validator: function(v: number[]) {
//               return v.length === 2 && v[0] >= -180 && v[0] <= 180 && v[1] >= -90 && v[1] <= 90;
//             },
//             message: 'Coordinates must be [longitude, latitude] with valid ranges'
//           }
//         }
//       },
//       waypoints: [
//         {
//           type: {
//             type: String,
//             enum: ['Point'],
//             required: true,
//             default: 'Point'
//           },
//           coordinates: {
//             type: [Number],
//             required: true
//           },
//           name: String,
//           _id: false
//         }
//       ],
//       polyline: [
//         {
//           lat: { type: Number, required: true },
//           lng: { type: Number, required: true },
//           _id: false
//         }
//       ],
//       distance: { type: Number, required: true },
//       estimatedDuration: { type: Number, required: true },
//       elevation: { type: Number },
//       difficulty: {
//         type: String,
//         enum: ['beginner', 'intermediate', 'advanced'],
//         default: 'intermediate'
//       }
//     },
    
//     // Schedule
//     scheduledAt: { type: Date, required: true, index: true },
//     timezone: { type: String, default: 'Asia/Kolkata' },
    
//     // Rules & Requirements
//     rules: [{ type: String, default: 'Helmet mandatory' }],
//     minRidingHours: { type: Number, default: 0 },
//     bikeTypes: [String],
//     maxParticipants: {
//       type: Number,
//       default: 50,
//       min: 2,
//       max: 200
//     },
    
//     // Participants
//     participants: [
//       {
//         userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
//         status: {
//           type: String,
//           enum: ['rsvp', 'joined', 'completed', 'cancelled'],
//           default: 'rsvp'
//         },
//         joinedAt: { type: Date, default: Date.now },
//         leftAt: Date,
//         bikeId: { type: Schema.Types.ObjectId, ref: 'Bike' },
//         _id: false
//       }
//     ],
    
//     // Status

//     status: {
//       type: String,
//       enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'],
//       default: 'draft',
//       index: true
//     },
//     liveStartedAt: Date,
//     liveEndedAt: Date,

//     lateJoinConfig: {
//       allowLateJoin: { type: Boolean, default: true },
//       lateJoinWindowMinutes: { type: Number, default: 15 },
//       maxDistanceFromStartKm: { type: Number, default: 2 }
//     },
    
//     // Safety & Engagement
//     safetyLevel: {
//       type: String,
//       enum: ['low', 'medium', 'high'],
//       default: 'high'
//     },
//     badgeRewards: [{ type: Schema.Types.ObjectId, ref: 'Badge' }]
//   },
//   { timestamps: true, collection: 'ride_events' }
// );

// // Geospatial index on startPoint
// rideEventSchema.index({ 'route.startPoint': '2dsphere' });
// rideEventSchema.index({ organizerId: 1, status: 1 });
// rideEventSchema.index({ scheduledAt: 1, status: 1 });
// rideEventSchema.index({ 'participants.userId': 1 });

// const RideEvent = mongoose.model<IRideEvent>('RideEvent', rideEventSchema);
// export default RideEvent;





import mongoose, { Schema, Document } from 'mongoose';

export interface IRideEvent extends Document {
  // Core metadata
  title: string;
  description?: string;
  organizerId: mongoose.Types.ObjectId;

  // Events & Tours specific metadata
  sponsor?: string; // Brand / partner
  banner?: string; // Hero image URL
  itinerary?: string; // Detailed schedule/plan
  inclusions?: string; // What's included in ticket

  // Monetization
  privacy: "public" | "private"; // public = free, private = paid
  price: number; // 0 for free events

  // Categorisation & discovery
  location?: string; // City / place name (for text search)
  category?: "city" | "state" | "national" | "brand";

  // Chat/group link
  chatRoomId?: string;

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
    status: 'JOINED' | 'ACTIVE' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
    joinedAt: Date;
    leftAt?: Date;
    bikeId?: mongoose.Types.ObjectId;
    personalStartTime?: Date;
    personalEndTime?: Date;
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

    // Ticketing (paid / private events)
    ticketId?: string; // Unique ticket/order id
    qrCode?: string; // QR payload or data URL
    paymentId?: mongoose.Types.ObjectId; // Reference to Payment document
  }>;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  liveStartedAt?: Date;
  liveEndedAt?: Date;
  lateJoinConfig: {
    allowLateJoin: boolean;
    lateJoinWindowMinutes: number;
    maxDistanceFromStartKm: number;
  };
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

    // Events & Tours specific metadata
    sponsor: {
      type: String,
      maxlength: 200,
      default: null
    },
    banner: {
      type: String,
      default: null
    },
    itinerary: {
      type: String,
      default: null
    },
    inclusions: {
      type: String,
      default: null
    },

    // Monetization
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true
    },
    price: {
      type: Number,
      default: 0,
      min: 0
    },

    // Categorisation & discovery
    location: {
      type: String,
      index: true,
      default: null
    },
    category: {
      type: String,
      enum: ['city', 'state', 'national', 'brand'],
      default: undefined
    },

    // Chat / group linkage
    chatRoomId: {
      type: String,
      default: null
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
            validator: function (v: number[]) {
              return (
                v.length === 2 &&
                v[0] >= -180 &&
                v[0] <= 180 &&
                v[1] >= -90 &&
                v[1] <= 90
              );
            },
            message:
              'Coordinates must be [longitude, latitude] with valid ranges'
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
            validator: function (v: number[]) {
              return (
                v.length === 2 &&
                v[0] >= -180 &&
                v[0] <= 180 &&
                v[1] >= -90 &&
                v[1] <= 90
              );
            },
            message:
              'Coordinates must be [longitude, latitude] with valid ranges'
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

    // Participants - UPDATED with new fields & ticketing
    participants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
          type: String,
          enum: ['JOINED', 'ACTIVE', 'COMPLETED', 'NO_SHOW', 'CANCELLED'],
          default: 'JOINED'
        },
        joinedAt: { type: Date, default: Date.now },
        leftAt: Date,
        bikeId: { type: Schema.Types.ObjectId, ref: 'Bike' },
        personalStartTime: { type: Date, default: null },
        personalEndTime: { type: Date, default: null },
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
        wasLateJoin: { type: Boolean, default: false },
        lateJoinReason: String,
        isNoShow: { type: Boolean, default: false },
        noShowReason: String,

        // Ticketing (paid events)
        ticketId: { type: String, default: null },
        qrCode: { type: String, default: null },
        paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
        _id: false
      }
    ],

    // Status - UPDATED
    status: {
      type: String,
      enum: ['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED'],
      default: 'SCHEDULED',
      index: true
    },
    liveStartedAt: Date,
    liveEndedAt: Date,

    // Late Join Config - NEW
    lateJoinConfig: {
      allowLateJoin: { type: Boolean, default: true },
      lateJoinWindowMinutes: { type: Number, default: 15 },
      maxDistanceFromStartKm: { type: Number, default: 2 }
    },

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
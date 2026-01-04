import mongoose, { Schema } from 'mongoose';
// ============================================
// Location History Schema
// ============================================
const locationHistorySchema = new Schema({
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
}, { _id: false });
// ============================================
// SOS Alert Schema
// ============================================
const sosAlertSchema = new Schema({
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
}, { _id: false });
// ============================================
// SOS Log Schema
// ============================================
const sosLogSchema = new Schema({
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
}, {
    timestamps: true,
    collection: 'sos_logs',
});
// ============================================
// Indexes
// ============================================
// Auto-expire SOS logs after 30 days
sosLogSchema.index({ triggeredAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
// Index for user SOS history
sosLogSchema.index({ userId: 1, status: 1, triggeredAt: -1 });
const SOSLog = mongoose.model('SOSLog', sosLogSchema);
export default SOSLog;
//# sourceMappingURL=soslog.model.js.map
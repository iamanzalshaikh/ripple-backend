import mongoose, { Schema } from 'mongoose';
const awardSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    badgeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Badge',
        required: true,
        index: true
    },
    awardedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });
awardSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
export default mongoose.model('Award', awardSchema);
//# sourceMappingURL=award.model.js.map
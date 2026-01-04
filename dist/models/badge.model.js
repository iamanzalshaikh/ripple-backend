import mongoose, { Schema } from 'mongoose';
const badgeSchema = new Schema({
    code: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    iconUrl: {
        type: String
    },
    rule: {
        type: {
            type: String,
            enum: ['distance', 'speed', 'duration', 'night', 'group', 'event'],
            required: true
        },
        min: Number,
        max: Number
    }
}, { timestamps: true });
export default mongoose.model('Badge', badgeSchema);
//# sourceMappingURL=badge.model.js.map
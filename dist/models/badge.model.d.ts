import mongoose, { Document } from 'mongoose';
interface IBadge extends Document {
    code: string;
    name: string;
    description: string;
    iconUrl: string;
    rule: {
        type: 'distance' | 'speed' | 'duration' | 'night' | 'group' | 'event';
        min?: number;
        max?: number;
    };
    createdAt: Date;
}
declare const _default: mongoose.Model<IBadge, {}, {}, {}, mongoose.Document<unknown, {}, IBadge, {}, {}> & IBadge & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=badge.model.d.ts.map
import mongoose, { Document } from 'mongoose';
interface IAward extends Document {
    userId: mongoose.Types.ObjectId;
    badgeId: mongoose.Types.ObjectId;
    awardedAt: Date;
}
declare const _default: mongoose.Model<IAward, {}, {}, {}, mongoose.Document<unknown, {}, IAward, {}, {}> & IAward & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=award.model.d.ts.map
import mongoose, { Document, Schema } from 'mongoose';


interface IAward extends Document {
    userId: mongoose.Types.ObjectId;
    badgeId: mongoose.Types.ObjectId;
    awardedAt: Date;
  }
  
  const awardSchema = new Schema<IAward>(
    {
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
    },
    { timestamps: true }
  );
  
  awardSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
  
  export default mongoose.model<IAward>('Award', awardSchema);
  
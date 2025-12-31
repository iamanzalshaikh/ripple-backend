import mongoose, { Document, Schema } from 'mongoose';

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
  
  const badgeSchema = new Schema<IBadge>(
    {
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
        max: Number,
        _id: false
      }
    },
    { timestamps: true }
  );
  
  export default mongoose.model<IBadge>('Badge', badgeSchema);
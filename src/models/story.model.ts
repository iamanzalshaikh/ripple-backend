import mongoose, { Schema, Document } from 'mongoose';

export interface IOverlay {
  type: 'text' | 'emoji';
  content: string;
  x: number;
  y: number;
  style?: any;
}

export interface IStory extends Document {
  userId: mongoose.Types.ObjectId;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  viewers: mongoose.Types.ObjectId[];
  overlays?: IOverlay[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    mediaUrl: {
      type: String,
      required: true
    },
    mediaType: {
      type: String,
      enum: ['photo', 'video'],
      default: 'photo'
    },
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index: document will be deleted at this time
    },
    overlays: [
      {
        type: { type: String, enum: ["text", "emoji"] },
        content: String,
        x: Number,
        y: Number,
        style: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'stories'
  }
);

// Index for fetching active stories by user
storySchema.index({ userId: 1, createdAt: -1 });

const Story = mongoose.model<IStory>('Story', storySchema);
export default Story;

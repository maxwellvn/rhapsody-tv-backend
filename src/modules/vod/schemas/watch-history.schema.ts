import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WatchHistoryDocument = HydratedDocument<WatchHistory>;

@Schema({ timestamps: true })
export class WatchHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ default: 0 })
  watchedSeconds: number;

  @Prop({ default: 0 })
  totalDurationSeconds: number;

  @Prop({ default: Date.now })
  lastWatchedAt: Date;

  @Prop({ default: false })
  completed: boolean;
}

export const WatchHistorySchema = SchemaFactory.createForClass(WatchHistory);

// Compound unique index - one entry per user per video (updated on each watch)
WatchHistorySchema.index({ userId: 1, videoId: 1 }, { unique: true });
// Index for querying user's history sorted by last watched
WatchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LivestreamWatchHistoryDocument =
  HydratedDocument<LivestreamWatchHistory>;

@Schema({ timestamps: true })
export class LivestreamWatchHistory {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LiveStream', required: true, index: true })
  livestreamId: Types.ObjectId;

  @Prop({ default: 0 })
  watchedSeconds: number;

  @Prop({ default: Date.now })
  lastWatchedAt: Date;
}

export const LivestreamWatchHistorySchema = SchemaFactory.createForClass(
  LivestreamWatchHistory,
);

// Compound unique index - one entry per user per livestream (updated on each watch)
LivestreamWatchHistorySchema.index(
  { userId: 1, livestreamId: 1 },
  { unique: true },
);
// Index for querying user's history sorted by last watched
LivestreamWatchHistorySchema.index({ userId: 1, lastWatchedAt: -1 });

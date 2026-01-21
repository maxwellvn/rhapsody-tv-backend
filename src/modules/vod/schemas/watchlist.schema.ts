import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WatchlistDocument = HydratedDocument<Watchlist>;

@Schema({ timestamps: true })
export class Watchlist {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;
}

export const WatchlistSchema = SchemaFactory.createForClass(Watchlist);

// Compound unique index to prevent duplicate entries
WatchlistSchema.index({ userId: 1, videoId: 1 }, { unique: true });

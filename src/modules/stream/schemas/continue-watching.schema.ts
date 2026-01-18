import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ContinueWatchingDocument = HydratedDocument<ContinueWatching>;

@Schema({ timestamps: true })
export class ContinueWatching {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ required: true, default: 0 })
  progressSeconds: number;

  @Prop({ required: true })
  durationSeconds: number;

  @Prop({ default: 0 })
  lastPositionSeconds: number;
}

export const ContinueWatchingSchema =
  SchemaFactory.createForClass(ContinueWatching);

// Indexes
ContinueWatchingSchema.index({ userId: 1, videoId: 1 }, { unique: true });
ContinueWatchingSchema.index({ userId: 1, updatedAt: -1 });

// Ensure __v is removed
ContinueWatchingSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

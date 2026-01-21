import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LivestreamLikeDocument = HydratedDocument<LivestreamLike>;

@Schema({ timestamps: true })
export class LivestreamLike {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LiveStream', required: true, index: true })
  livestreamId: Types.ObjectId;
}

export const LivestreamLikeSchema = SchemaFactory.createForClass(LivestreamLike);

// Compound unique index to prevent duplicate likes
LivestreamLikeSchema.index({ userId: 1, livestreamId: 1 }, { unique: true });

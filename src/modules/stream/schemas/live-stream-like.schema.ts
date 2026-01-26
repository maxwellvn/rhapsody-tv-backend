import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LiveStreamLikeDocument = HydratedDocument<LiveStreamLike>;

@Schema({ timestamps: true })
export class LiveStreamLike {
  @Prop({
    type: Types.ObjectId,
    ref: 'LiveStream',
    required: true,
    index: true,
  })
  livestreamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;
}

export const LiveStreamLikeSchema =
  SchemaFactory.createForClass(LiveStreamLike);

// Compound index to ensure a user can only like a livestream once
LiveStreamLikeSchema.index({ livestreamId: 1, userId: 1 }, { unique: true });

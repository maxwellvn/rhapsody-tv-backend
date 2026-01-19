import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VideoLikeDocument = HydratedDocument<VideoLike>;

@Schema({ timestamps: true })
export class VideoLike {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;
}

export const VideoLikeSchema = SchemaFactory.createForClass(VideoLike);

// Unique constraint: a user can only like a video once
VideoLikeSchema.index({ userId: 1, videoId: 1 }, { unique: true });

// Ensure __v is removed
VideoLikeSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

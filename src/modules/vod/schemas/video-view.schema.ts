import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VideoViewDocument = HydratedDocument<VideoView>;

@Schema({ timestamps: true })
export class VideoView {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;
}

export const VideoViewSchema = SchemaFactory.createForClass(VideoView);

// A user should contribute at most one view to a video's aggregate count.
VideoViewSchema.index({ userId: 1, videoId: 1 }, { unique: true });

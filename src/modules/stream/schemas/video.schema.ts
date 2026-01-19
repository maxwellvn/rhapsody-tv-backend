import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VideoDocument = HydratedDocument<Video>;

export enum VideoVisibility {
  PUBLIC = 'public',
  UNLISTED = 'unlisted',
  PRIVATE = 'private',
}

@Schema({ timestamps: true })
export class Video {
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true })
  playbackUrl: string;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  durationSeconds?: number;

  @Prop({ enum: VideoVisibility, default: VideoVisibility.PUBLIC, index: true })
  visibility: VideoVisibility;

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: false })
  isLive: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  likeCount: number;

  @Prop({ default: 0 })
  commentCount: number;

  @Prop({ index: true })
  publishedAt?: Date;
}

export const VideoSchema = SchemaFactory.createForClass(Video);

// Indexes
VideoSchema.index({ channelId: 1, createdAt: -1 });
VideoSchema.index({ visibility: 1, publishedAt: -1 });
VideoSchema.index({ isActive: 1 });

// Ensure __v is removed
VideoSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

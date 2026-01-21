import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type VideoCommentDocument = HydratedDocument<VideoComment>;

@Schema({ timestamps: true })
export class VideoComment {
  @Prop({ type: Types.ObjectId, ref: 'Video', required: true, index: true })
  videoId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'VideoComment', index: true })
  parentCommentId?: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: 0 })
  likeCount: number;
}

export const VideoCommentSchema = SchemaFactory.createForClass(VideoComment);

// Indexes for efficient queries
VideoCommentSchema.index({ videoId: 1, createdAt: -1 });
VideoCommentSchema.index({ videoId: 1, parentCommentId: 1, createdAt: 1 });

// Ensure __v is removed
VideoCommentSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

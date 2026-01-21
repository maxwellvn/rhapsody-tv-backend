import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LiveStreamCommentDocument = HydratedDocument<LiveStreamComment>;

@Schema({ timestamps: true })
export class LiveStreamComment {
  @Prop({
    type: Types.ObjectId,
    ref: 'LiveStream',
    required: true,
    index: true,
  })
  liveStreamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  message: string;

  @Prop({ type: Types.ObjectId, ref: 'LiveStreamComment', index: true })
  parentCommentId?: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const LiveStreamCommentSchema =
  SchemaFactory.createForClass(LiveStreamComment);

// Indexes
LiveStreamCommentSchema.index({ liveStreamId: 1, createdAt: -1 });
LiveStreamCommentSchema.index({
  liveStreamId: 1,
  parentCommentId: 1,
  createdAt: 1,
});

// Ensure __v is removed
LiveStreamCommentSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

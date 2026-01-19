import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CommentLikeDocument = HydratedDocument<CommentLike>;

@Schema({ timestamps: true })
export class CommentLike {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VideoComment',
    required: true,
    index: true,
  })
  commentId: Types.ObjectId;
}

export const CommentLikeSchema = SchemaFactory.createForClass(CommentLike);

// Unique constraint: a user can only like a comment once
CommentLikeSchema.index({ userId: 1, commentId: 1 }, { unique: true });

// Ensure __v is removed
CommentLikeSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

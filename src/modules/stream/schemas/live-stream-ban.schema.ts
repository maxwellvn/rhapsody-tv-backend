import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LiveStreamBanDocument = HydratedDocument<LiveStreamBan>;

@Schema({ timestamps: true })
export class LiveStreamBan {
  @Prop({
    type: Types.ObjectId,
    ref: 'LiveStream',
    required: true,
  })
  livestreamId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  bannedBy: Types.ObjectId;

  @Prop({ trim: true, maxlength: 500 })
  reason?: string;
}

export const LiveStreamBanSchema = SchemaFactory.createForClass(LiveStreamBan);

// Compound unique index for efficient lookups and preventing duplicate bans
LiveStreamBanSchema.index({ livestreamId: 1, userId: 1 }, { unique: true });

// Index for querying all bans for a user (e.g., "is this user banned from any stream?")
LiveStreamBanSchema.index({ userId: 1 });

// Index for querying all bans in a livestream (e.g., admin viewing ban list)
LiveStreamBanSchema.index({ livestreamId: 1, createdAt: -1 });

// Ensure __v is removed from JSON output
LiveStreamBanSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

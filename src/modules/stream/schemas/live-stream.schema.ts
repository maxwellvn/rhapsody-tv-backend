import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LiveStreamDocument = HydratedDocument<LiveStream>;

export enum LiveStreamStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELED = 'canceled',
}

@Schema({ timestamps: true })
export class LiveStream {
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    required: true,
    enum: LiveStreamStatus,
    default: LiveStreamStatus.SCHEDULED,
  })
  status: LiveStreamStatus;

  @Prop({ index: true })
  scheduledStartAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  playbackUrl?: string;

  @Prop()
  rtmpUrl?: string;

  @Prop()
  streamKey?: string;

  @Prop({ default: false })
  isChatEnabled: boolean;
}

export const LiveStreamSchema = SchemaFactory.createForClass(LiveStream);

// Indexes
LiveStreamSchema.index({ channelId: 1, createdAt: -1 });
LiveStreamSchema.index({ status: 1, scheduledStartAt: -1 });
LiveStreamSchema.index({ status: 1, startedAt: -1 });

// Ensure __v is removed
LiveStreamSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

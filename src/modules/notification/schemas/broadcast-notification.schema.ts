import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationType } from '../notification.schema';

export type BroadcastNotificationDocument = HydratedDocument<BroadcastNotification>;

export enum BroadcastTarget {
  ALL = 'all',
  CHANNEL_SUBSCRIBERS = 'channel_subscribers',
  PROGRAM_SUBSCRIBERS = 'program_subscribers',
}

@Schema({ timestamps: true })
export class BroadcastNotification {
  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  imageUrl?: string;

  @Prop({ enum: BroadcastTarget, default: BroadcastTarget.ALL })
  target: BroadcastTarget;

  @Prop({ type: Types.ObjectId, ref: 'Channel' })
  channelId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Program' })
  programId?: Types.ObjectId;

  @Prop({ type: Object })
  data?: {
    videoId?: string;
    channelId?: string;
    programId?: string;
    livestreamId?: string;
    link?: string;
  };

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sentBy?: Types.ObjectId;

  @Prop({ default: 0 })
  sentCount: number;

  @Prop({ default: 0 })
  failedCount: number;

  @Prop()
  sentAt?: Date;
}

export const BroadcastNotificationSchema = SchemaFactory.createForClass(BroadcastNotification);

// Index for querying broadcasts
BroadcastNotificationSchema.index({ createdAt: -1 });
BroadcastNotificationSchema.index({ type: 1 });

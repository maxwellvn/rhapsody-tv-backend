import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  NEW_VIDEO = 'new_video',
  NEW_LIVESTREAM = 'new_livestream',
  COMMENT_REPLY = 'comment_reply',
  VIDEO_LIKE = 'video_like',
  NEW_SUBSCRIBER = 'new_subscriber',
  CHANNEL_UPDATE = 'channel_update',
  PROGRAM_REMINDER = 'program_reminder',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  imageUrl?: string;

  @Prop({ type: Object })
  data?: {
    videoId?: string;
    channelId?: string;
    programId?: string;
    livestreamId?: string;
    commentId?: string;
  };

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for querying user's notifications
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

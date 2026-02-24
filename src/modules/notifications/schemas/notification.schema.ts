import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export enum NotificationType {
  CHANNEL_NEW_VIDEO = 'channel_new_video',
  CHANNEL_GO_LIVE = 'channel_go_live',
  CHANNEL_NEW_PROGRAM = 'channel_new_program',
  CHANNEL_NEW_SCHEDULE = 'channel_new_schedule',
  COMMENT_LIKED = 'comment_liked',
  COMMENT_REPLIED = 'comment_replied',
  ANNOUNCEMENT = 'announcement',
  CUSTOM = 'custom',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: NotificationType, required: true, index: true })
  type: NotificationType;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  body: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  data?: Record<string, unknown>;

  @Prop({ default: false, index: true })
  isRead: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });

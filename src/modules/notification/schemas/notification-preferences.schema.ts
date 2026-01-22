import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationPreferencesDocument = HydratedDocument<NotificationPreferences>;

@Schema({ timestamps: true })
export class NotificationPreferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  // Subscription notifications (new videos/streams from subscribed channels)
  @Prop({ default: true })
  subscriptions: boolean;

  // Recommended videos notifications (algorithmic recommendations)
  @Prop({ default: true })
  recommendedVideos: boolean;

  // Activity on user's comments (replies, likes)
  @Prop({ default: true })
  commentActivity: boolean;

  // New channel announcements
  @Prop({ default: true })
  newChannels: boolean;

  // Livestream notifications
  @Prop({ default: true })
  livestreams: boolean;

  // Last time recommendation notification was sent (to prevent spam)
  @Prop()
  lastRecommendationNotificationAt?: Date;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(NotificationPreferences);

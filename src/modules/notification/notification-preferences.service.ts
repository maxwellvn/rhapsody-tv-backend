import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  NotificationPreferences,
  NotificationPreferencesDocument,
} from './schemas/notification-preferences.schema';

export interface UpdateNotificationPreferencesDto {
  subscriptions?: boolean;
  recommendedVideos?: boolean;
  commentActivity?: boolean;
  newChannels?: boolean;
  livestreams?: boolean;
}

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  constructor(
    @InjectModel(NotificationPreferences.name)
    private preferencesModel: Model<NotificationPreferencesDocument>,
  ) {}

  /**
   * Get user's notification preferences (creates default if not exists)
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesDocument> {
    let preferences = await this.preferencesModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.preferencesModel.create({
        userId: new Types.ObjectId(userId),
        subscriptions: true,
        recommendedVideos: true,
        commentActivity: true,
        newChannels: true,
        livestreams: true,
      });
      this.logger.log(`Created default notification preferences for user ${userId}`);
    }

    return preferences;
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    updates: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesDocument> {
    const preferences = await this.preferencesModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: updates },
      { new: true, upsert: true },
    );

    this.logger.log(`Updated notification preferences for user ${userId}`);
    return preferences;
  }

  /**
   * Check if user wants subscription notifications
   */
  async wantsSubscriptionNotifications(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.subscriptions;
  }

  /**
   * Check if user wants recommended video notifications
   */
  async wantsRecommendedVideoNotifications(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.recommendedVideos;
  }

  /**
   * Check if user wants comment activity notifications
   */
  async wantsCommentActivityNotifications(userId: string): Promise<boolean> {
    const prefs = await this.getPreferences(userId);
    return prefs.commentActivity;
  }

  /**
   * Get all users who want recommended video notifications
   */
  async getUsersWantingRecommendations(): Promise<NotificationPreferencesDocument[]> {
    return this.preferencesModel.find({ recommendedVideos: true });
  }

  /**
   * Update last recommendation notification timestamp
   */
  async updateLastRecommendationTime(userId: string): Promise<void> {
    await this.preferencesModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $set: { lastRecommendationNotificationAt: new Date() } },
    );
  }

  /**
   * Get users eligible for recommendation notifications
   * (want recommendations AND haven't been notified recently)
   */
  async getUsersEligibleForRecommendations(
    minHoursSinceLastNotification: number = 24,
  ): Promise<NotificationPreferencesDocument[]> {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - minHoursSinceLastNotification);

    return this.preferencesModel.find({
      recommendedVideos: true,
      $or: [
        { lastRecommendationNotificationAt: { $exists: false } },
        { lastRecommendationNotificationAt: null },
        { lastRecommendationNotificationAt: { $lt: cutoffTime } },
      ],
    });
  }
}

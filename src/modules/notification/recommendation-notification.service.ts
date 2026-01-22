import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import { WatchHistory, WatchHistoryDocument } from '../vod/schemas/watch-history.schema';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationType } from './notification.schema';

interface VideoRecommendation {
  video: VideoDocument;
  score: number;
}

@Injectable()
export class RecommendationNotificationService {
  private readonly logger = new Logger(RecommendationNotificationService.name);

  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    @InjectModel(WatchHistory.name) private watchHistoryModel: Model<WatchHistoryDocument>,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Cron job that runs every 6 hours to send personalized video recommendations
   * Users will receive at most 1 recommendation notification every 24 hours
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async sendRecommendationNotifications(): Promise<void> {
    this.logger.log('Starting scheduled recommendation notifications...');

    try {
      // Get users eligible for recommendations (haven't been notified in 24 hours)
      const eligibleUsers = await this.preferencesService.getUsersEligibleForRecommendations(24);
      
      if (eligibleUsers.length === 0) {
        this.logger.log('No users eligible for recommendation notifications');
        return;
      }

      this.logger.log(`Found ${eligibleUsers.length} users eligible for recommendations`);

      let successCount = 0;
      let failCount = 0;

      for (const userPrefs of eligibleUsers) {
        try {
          const userId = userPrefs.userId.toString();
          const recommendation = await this.getPersonalizedRecommendation(userId);

          if (recommendation) {
            await this.sendRecommendationNotification(userId, recommendation.video);
            await this.preferencesService.updateLastRecommendationTime(userId);
            successCount++;
          }
        } catch (error) {
          this.logger.error(`Error sending recommendation to user ${userPrefs.userId}:`, error);
          failCount++;
        }
      }

      this.logger.log(
        `Recommendation notifications complete: ${successCount} sent, ${failCount} failed`,
      );
    } catch (error) {
      this.logger.error('Error in recommendation notification cron:', error);
    }
  }

  /**
   * Get a personalized video recommendation for a user based on their watch history
   */
  async getPersonalizedRecommendation(userId: string): Promise<VideoRecommendation | null> {
    // Get user's watch history to understand preferences
    const watchHistory = await this.watchHistoryModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .limit(20)
      .populate('videoId');

    // Get channels and programs the user has watched
    const watchedChannels = new Set<string>();
    const watchedPrograms = new Set<string>();
    const watchedVideoIds = new Set<string>();

    watchHistory.forEach((entry) => {
      const video = entry.videoId as unknown as VideoDocument;
      if (video) {
        watchedVideoIds.add(video._id.toString());
        if (video.channelId) {
          watchedChannels.add(video.channelId.toString());
        }
        if (video.programId) {
          watchedPrograms.add(video.programId.toString());
        }
      }
    });

    // Build recommendation query
    const query: any = {
      isActive: true,
      _id: { $nin: Array.from(watchedVideoIds).map((id) => new Types.ObjectId(id)) },
    };

    // If user has watch history, prefer videos from channels/programs they've watched
    let recommendations: VideoDocument[];

    if (watchedChannels.size > 0 || watchedPrograms.size > 0) {
      // Strategy 1: Videos from channels/programs user has watched but hasn't seen
      recommendations = await this.videoModel
        .find({
          ...query,
          $or: [
            { channelId: { $in: Array.from(watchedChannels).map((id) => new Types.ObjectId(id)) } },
            { programId: { $in: Array.from(watchedPrograms).map((id) => new Types.ObjectId(id)) } },
          ],
        })
        .sort({ viewCount: -1, createdAt: -1 })
        .limit(10)
        .populate('channelId', 'name');

      if (recommendations.length === 0) {
        // Strategy 2: Fall back to popular recent videos
        recommendations = await this.getPopularRecentVideos(query);
      }
    } else {
      // No watch history - recommend popular recent videos
      recommendations = await this.getPopularRecentVideos(query);
    }

    if (recommendations.length === 0) {
      return null;
    }

    // Score and pick the best recommendation
    const scored = recommendations.map((video) => ({
      video,
      score: this.calculateRecommendationScore(video, watchedChannels, watchedPrograms),
    }));

    scored.sort((a, b) => b.score - a.score);

    // Add some randomness by picking from top 3
    const topN = scored.slice(0, Math.min(3, scored.length));
    const randomIndex = Math.floor(Math.random() * topN.length);

    return topN[randomIndex];
  }

  /**
   * Get popular recent videos
   */
  private async getPopularRecentVideos(baseQuery: any): Promise<VideoDocument[]> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return this.videoModel
      .find({
        ...baseQuery,
        createdAt: { $gte: oneWeekAgo },
      })
      .sort({ viewCount: -1, likeCount: -1 })
      .limit(10)
      .populate('channelId', 'name');
  }

  /**
   * Calculate recommendation score for a video
   */
  private calculateRecommendationScore(
    video: VideoDocument,
    watchedChannels: Set<string>,
    watchedPrograms: Set<string>,
  ): number {
    let score = 0;

    // Boost for videos from watched channels
    if (video.channelId && watchedChannels.has(video.channelId.toString())) {
      score += 50;
    }

    // Boost for videos from watched programs
    if (video.programId && watchedPrograms.has(video.programId.toString())) {
      score += 30;
    }

    // Boost for popular videos
    score += Math.min(video.viewCount || 0, 1000) / 100;
    score += Math.min(video.likeCount || 0, 100);

    // Boost for recent videos (within 3 days)
    // Use publishedAt if available, otherwise use document creation time
    const videoDate = video.publishedAt || (video as any).createdAt;
    const daysSincePublished = videoDate
      ? (Date.now() - new Date(videoDate).getTime()) / (1000 * 60 * 60 * 24)
      : 30;
    if (daysSincePublished < 3) {
      score += 20;
    } else if (daysSincePublished < 7) {
      score += 10;
    }

    return score;
  }

  /**
   * Send recommendation notification to a user
   */
  private async sendRecommendationNotification(
    userId: string,
    video: VideoDocument,
  ): Promise<void> {
    const channelName = (video.channelId as any)?.name || 'a channel';

    await this.pushNotificationService.createAndSendToUsers(
      [userId],
      NotificationType.RECOMMENDED_VIDEO,
      'Recommended for you',
      `${video.title} from ${channelName}`,
      { videoId: video._id.toString() },
      video.thumbnailUrl,
    );

    this.logger.log(`Sent recommendation notification to user ${userId}: ${video.title}`);
  }

  /**
   * Manually trigger recommendation for a specific user (for testing)
   */
  async sendRecommendationToUser(userId: string): Promise<boolean> {
    const prefs = await this.preferencesService.getPreferences(userId);
    
    if (!prefs.recommendedVideos) {
      this.logger.log(`User ${userId} has disabled recommendation notifications`);
      return false;
    }

    const recommendation = await this.getPersonalizedRecommendation(userId);
    
    if (!recommendation) {
      this.logger.log(`No suitable recommendation found for user ${userId}`);
      return false;
    }

    await this.sendRecommendationNotification(userId, recommendation.video);
    await this.preferencesService.updateLastRecommendationTime(userId);
    
    return true;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from '../../../shared/enums/role.enum';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { Channel, ChannelDocument } from '../../channel/schemas/channel.schema';
import {
  Video,
  VideoDocument,
  VideoVisibility,
} from '../../stream/schemas/video.schema';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamStatus,
} from '../../stream/schemas/live-stream.schema';
import { Program, ProgramDocument } from '../../channel/schemas/program.schema';
import {
  Watchlist,
  WatchlistDocument,
} from '../../user/schemas/watchlist.schema';
import {
  ContinueWatching,
  ContinueWatchingDocument,
} from '../../stream/schemas/continue-watching.schema';
import {
  ChannelSubscription,
  ChannelSubscriptionDocument,
} from '../../notifications/schemas/channel-subscription.schema';
import {
  VideoComment,
  VideoCommentDocument,
} from '../../vod/schemas/video-comment.schema';
import {
  LiveStreamComment,
  LiveStreamCommentDocument,
} from '../../stream/schemas/live-stream-comment.schema';
import {
  LiveStreamBan,
  LiveStreamBanDocument,
} from '../../stream/schemas/live-stream-ban.schema';
import {
  AdminDashboardEngagementResponseDto,
  AdminDashboardOverviewResponseDto,
  AdminDashboardTopChannelDto,
  AdminDashboardTopVideoDto,
} from '../dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(LiveStream.name)
    private readonly livestreamModel: Model<LiveStreamDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
    @InjectModel(Watchlist.name)
    private readonly watchlistModel: Model<WatchlistDocument>,
    @InjectModel(ContinueWatching.name)
    private readonly continueWatchingModel: Model<ContinueWatchingDocument>,
    @InjectModel(ChannelSubscription.name)
    private readonly subscriptionModel: Model<ChannelSubscriptionDocument>,
    @InjectModel(VideoComment.name)
    private readonly videoCommentModel: Model<VideoCommentDocument>,
    @InjectModel(LiveStreamComment.name)
    private readonly livestreamCommentModel: Model<LiveStreamCommentDocument>,
    @InjectModel(LiveStreamBan.name)
    private readonly livestreamBanModel: Model<LiveStreamBanDocument>,
  ) {}

  private getDateThreshold(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  async getOverview(): Promise<AdminDashboardOverviewResponseDto> {
    const last7Days = this.getDateThreshold(7);
    const last30Days = this.getDateThreshold(30);
    const now = new Date();

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      adminUsers,
      newUsersLast7Days,
      newUsersLast30Days,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ isActive: true }),
      this.userModel.countDocuments({ isEmailVerified: true }),
      this.userModel.countDocuments({ roles: { $in: [Role.ADMIN] } }),
      this.userModel.countDocuments({ createdAt: { $gte: last7Days } }),
      this.userModel.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    const [
      totalChannels,
      activeChannels,
      newChannelsLast7Days,
      newChannelsLast30Days,
    ] = await Promise.all([
      this.channelModel.countDocuments(),
      this.channelModel.countDocuments({ isActive: true }),
      this.channelModel.countDocuments({ createdAt: { $gte: last7Days } }),
      this.channelModel.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    const [
      totalVideos,
      activeVideos,
      publicVideos,
      unlistedVideos,
      privateVideos,
      newVideosLast7Days,
      newVideosLast30Days,
    ] = await Promise.all([
      this.videoModel.countDocuments(),
      this.videoModel.countDocuments({ isActive: true }),
      this.videoModel.countDocuments({
        visibility: VideoVisibility.PUBLIC,
        isActive: true,
      }),
      this.videoModel.countDocuments({
        visibility: VideoVisibility.UNLISTED,
        isActive: true,
      }),
      this.videoModel.countDocuments({
        visibility: VideoVisibility.PRIVATE,
        isActive: true,
      }),
      this.videoModel.countDocuments({ createdAt: { $gte: last7Days } }),
      this.videoModel.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    const [
      totalLivestreams,
      liveLivestreams,
      scheduledLivestreams,
      endedLivestreams,
      canceledLivestreams,
      newLivestreamsLast7Days,
      newLivestreamsLast30Days,
    ] = await Promise.all([
      this.livestreamModel.countDocuments(),
      this.livestreamModel.countDocuments({ status: LiveStreamStatus.LIVE }),
      this.livestreamModel.countDocuments({
        status: LiveStreamStatus.SCHEDULED,
      }),
      this.livestreamModel.countDocuments({ status: LiveStreamStatus.ENDED }),
      this.livestreamModel.countDocuments({ status: LiveStreamStatus.CANCELED }),
      this.livestreamModel.countDocuments({ createdAt: { $gte: last7Days } }),
      this.livestreamModel.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    const [
      totalPrograms,
      activePrograms,
      upcomingPrograms,
      newProgramsLast7Days,
      newProgramsLast30Days,
    ] = await Promise.all([
      this.programModel.countDocuments(),
      this.programModel.countDocuments({ isActive: true }),
      this.programModel.countDocuments({
        isActive: true,
        startTime: { $gt: now },
      }),
      this.programModel.countDocuments({ createdAt: { $gte: last7Days } }),
      this.programModel.countDocuments({ createdAt: { $gte: last30Days } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        verified: verifiedUsers,
        admins: adminUsers,
        newLast7Days: newUsersLast7Days,
        newLast30Days: newUsersLast30Days,
      },
      channels: {
        total: totalChannels,
        active: activeChannels,
        newLast7Days: newChannelsLast7Days,
        newLast30Days: newChannelsLast30Days,
      },
      videos: {
        total: totalVideos,
        active: activeVideos,
        public: publicVideos,
        unlisted: unlistedVideos,
        private: privateVideos,
        newLast7Days: newVideosLast7Days,
        newLast30Days: newVideosLast30Days,
      },
      livestreams: {
        total: totalLivestreams,
        live: liveLivestreams,
        scheduled: scheduledLivestreams,
        ended: endedLivestreams,
        canceled: canceledLivestreams,
        newLast7Days: newLivestreamsLast7Days,
        newLast30Days: newLivestreamsLast30Days,
      },
      programs: {
        total: totalPrograms,
        active: activePrograms,
        upcoming: upcomingPrograms,
        newLast7Days: newProgramsLast7Days,
        newLast30Days: newProgramsLast30Days,
      },
    };
  }

  async getEngagement(): Promise<AdminDashboardEngagementResponseDto> {
    const [videoEngagement, commentLikeTotals] = await Promise.all([
      this.videoModel.aggregate([
        {
          $group: {
            _id: null,
            totalViews: { $sum: { $ifNull: ['$viewCount', 0] } },
            totalLikes: { $sum: { $ifNull: ['$likeCount', 0] } },
            totalComments: { $sum: { $ifNull: ['$commentCount', 0] } },
          },
        },
      ]),
      this.videoCommentModel.aggregate([
        { $match: { isDeleted: false } },
        {
          $group: {
            _id: null,
            totalCommentLikes: { $sum: { $ifNull: ['$likeCount', 0] } },
          },
        },
      ]),
    ]);

    const videoAggregate = videoEngagement[0] ?? {
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
    };
    const commentLikeAggregate = commentLikeTotals[0] ?? {
      totalCommentLikes: 0,
    };

    const [
      livestreamLikeTotals,
      livestreamCommentTotals,
      livestreamBanTotals,
      watchlistItems,
      continueWatchingItems,
      channelSubscriptions,
      topVideos,
      topChannels,
    ] = await Promise.all([
      this.livestreamModel.aggregate([
        {
          $group: {
            _id: null,
            totalLikes: { $sum: { $ifNull: ['$likeCount', 0] } },
          },
        },
      ]),
      this.livestreamCommentModel.countDocuments({ isDeleted: false }),
      this.livestreamBanModel.countDocuments(),
      this.watchlistModel.countDocuments(),
      this.continueWatchingModel.countDocuments(),
      this.subscriptionModel.countDocuments({ isSubscribed: true }),
      this.videoModel
        .find({ isActive: true })
        .sort({ viewCount: -1 })
        .limit(5)
        .populate('channelId', 'name slug')
        .select('title viewCount likeCount commentCount channelId')
        .lean(),
      this.channelModel
        .find({ isActive: true })
        .sort({ subscriberCount: -1 })
        .limit(5)
        .select('name slug subscriberCount videoCount')
        .lean(),
    ]);

    const livestreamLikesAggregate = livestreamLikeTotals[0] ?? {
      totalLikes: 0,
    };

    const topVideoDtos: AdminDashboardTopVideoDto[] = topVideos.map((video) => {
      const channel =
        video.channelId &&
        typeof video.channelId === 'object' &&
        'name' in video.channelId
          ? (video.channelId as unknown as {
              _id: { toString: () => string };
              name: string;
              slug: string;
            })
          : undefined;

      return {
        id: video._id.toString(),
        title: video.title,
        viewCount: video.viewCount ?? 0,
        likeCount: video.likeCount ?? 0,
        commentCount: video.commentCount ?? 0,
        channel: channel
          ? {
              id: channel._id.toString(),
              name: channel.name,
              slug: channel.slug,
            }
          : undefined,
      };
    });

    const topChannelDtos: AdminDashboardTopChannelDto[] = topChannels.map(
      (channel) => ({
        id: channel._id.toString(),
        name: channel.name,
        slug: channel.slug,
        subscriberCount: channel.subscriberCount ?? 0,
        videoCount: channel.videoCount ?? 0,
      }),
    );

    return {
      videos: {
        totalViews: videoAggregate.totalViews ?? 0,
        totalLikes: videoAggregate.totalLikes ?? 0,
        totalComments: videoAggregate.totalComments ?? 0,
        totalCommentLikes: commentLikeAggregate.totalCommentLikes ?? 0,
      },
      livestreams: {
        totalLikes: livestreamLikesAggregate.totalLikes ?? 0,
        totalComments: livestreamCommentTotals ?? 0,
        totalBans: livestreamBanTotals ?? 0,
      },
      audience: {
        watchlistItems,
        continueWatchingItems,
        channelSubscriptions,
      },
      topVideos: topVideoDtos,
      topChannels: topChannelDtos,
    };
  }
}

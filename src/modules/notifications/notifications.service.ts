import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChannelSubscription,
  ChannelSubscriptionDocument,
  Notification,
  NotificationDocument,
  NotificationType,
} from './schemas';
import { Channel, ChannelDocument } from '../channel/schemas/channel.schema';
import { Program, ProgramDocument } from '../channel/schemas/program.schema';
import { Schedule, ScheduleDocument, ScheduleTargetType } from '../channel/schemas/schedule.schema';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import { LiveStream, LiveStreamDocument } from '../stream/schemas/live-stream.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(ChannelSubscription.name)
    private readonly subscriptionModel: Model<ChannelSubscriptionDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(LiveStream.name)
    private readonly liveStreamModel: Model<LiveStreamDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
  ) {}

  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const doc = await this.notificationModel.create({
      userId: new Types.ObjectId(params.userId),
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data,
      isRead: false,
    });

    return doc;
  }

  async notifyChannelSubscribers(params: {
    channelId: string;
    type: NotificationType;
    preferenceKey: 'notifyOnNewVideo' | 'notifyOnGoLive' | 'notifyOnNewProgram';
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }) {
    const channelObjectId = new Types.ObjectId(params.channelId);

    const subscriptions = await this.subscriptionModel.find({
      channelId: channelObjectId,
      isSubscribed: true,
      [params.preferenceKey]: true,
    });

    if (subscriptions.length === 0) {
      return { count: 0 };
    }

    await this.notificationModel.insertMany(
      subscriptions.map((s) => ({
        userId: s.userId,
        type: params.type,
        title: params.title,
        body: params.body,
        data: params.data,
        isRead: false,
      })),
    );

    return { count: subscriptions.length };
  }

  async buildChannelTitle(channelId: string): Promise<string> {
    const channel = await this.channelModel
      .findById(channelId)
      .select('name')
      .lean();

    return channel?.name || 'A channel you follow';
  }

  async buildChannelContext(channelId: string): Promise<{
    name: string;
    slug?: string;
    avatarUrl?: string;
    coverImageUrl?: string;
  }> {
    const channel = await this.channelModel
      .findById(channelId)
      .select('name slug logoUrl coverImageUrl')
      .lean();

    return {
      name: channel?.name || 'A channel you follow',
      slug: channel?.slug,
      avatarUrl: channel?.logoUrl,
      coverImageUrl: channel?.coverImageUrl,
    };
  }

  async notifyNewVideo(params: {
    channelId: string;
    videoId: string;
    videoTitle: string;
  }) {
    const channel = await this.buildChannelContext(params.channelId);
    const video = await this.videoModel
      .findById(params.videoId)
      .select('thumbnailUrl programId')
      .lean();

    // If video belongs to a program, use the program name instead of the channel name
    let sourceName = channel.name;
    let sourceAvatarUrl = channel.avatarUrl;
    if (video?.programId) {
      const program = await this.programModel
        .findById(video.programId)
        .select('title thumbnailUrl')
        .lean();
      if (program?.title) {
        sourceName = program.title;
        sourceAvatarUrl = program.thumbnailUrl || channel.avatarUrl;
      }
    }

    return this.notifyChannelSubscribers({
      channelId: params.channelId,
      type: NotificationType.CHANNEL_NEW_VIDEO,
      preferenceKey: 'notifyOnNewVideo',
      title: `${sourceName} uploaded a new video`,
      body: params.videoTitle,
      data: {
        channelId: params.channelId,
        channelSlug: channel.slug,
        videoId: params.videoId,
        avatarUrl: sourceAvatarUrl,
        thumbnailUrl: video?.thumbnailUrl || channel.coverImageUrl,
      },
    });
  }

  async notifyGoLive(params: {
    channelId: string;
    livestreamId: string;
    livestreamTitle: string;
  }) {
    const channel = await this.buildChannelContext(params.channelId);
    const livestream = await this.liveStreamModel
      .findById(params.livestreamId)
      .select('thumbnailUrl programId')
      .lean();

    // If livestream belongs to a program, use the program name
    let sourceName = channel.name;
    let sourceAvatarUrl = channel.avatarUrl;
    if (livestream?.programId) {
      const program = await this.programModel
        .findById(livestream.programId)
        .select('title thumbnailUrl')
        .lean();
      if (program?.title) {
        sourceName = program.title;
        sourceAvatarUrl = program.thumbnailUrl || channel.avatarUrl;
      }
    }

    return this.notifyChannelSubscribers({
      channelId: params.channelId,
      type: NotificationType.CHANNEL_GO_LIVE,
      preferenceKey: 'notifyOnGoLive',
      title: `${sourceName} is live now`,
      body: params.livestreamTitle,
      data: {
        channelId: params.channelId,
        channelSlug: channel.slug,
        livestreamId: params.livestreamId,
        avatarUrl: sourceAvatarUrl,
        thumbnailUrl: livestream?.thumbnailUrl || channel.coverImageUrl,
      },
    });
  }

  async notifyNewProgram(params: {
    channelId: string;
    programId: string;
    programTitle: string;
    announcementPrefix?: string;
  }) {
    const channel = await this.buildChannelContext(params.channelId);
    const program = await this.programModel
      .findById(params.programId)
      .select('thumbnailUrl')
      .lean();

    const prefix = params.announcementPrefix ?? 'New Program';

    return this.notifyChannelSubscribers({
      channelId: params.channelId,
      type: NotificationType.CHANNEL_NEW_PROGRAM,
      preferenceKey: 'notifyOnNewProgram',
      title: `${prefix}: ${params.programTitle}`,
      body: `${channel.name}`,
      data: {
        channelId: params.channelId,
        channelSlug: channel.slug,
        programId: params.programId,
        avatarUrl: program?.thumbnailUrl || channel.avatarUrl,
        thumbnailUrl: program?.thumbnailUrl || channel.coverImageUrl,
      },
    });
  }

  async notifyNewSchedule(params: {
    scheduleId: string;
    targetType: ScheduleTargetType;
    targetId: string;
    scheduleTitle?: string;
  }) {
    let channelId: string;
    let targetName: string;
    let avatarUrl: string | undefined;
    let thumbnailUrl: string | undefined;

    if (params.targetType === ScheduleTargetType.CHANNEL) {
      channelId = params.targetId;
      const channel = await this.channelModel
        .findById(params.targetId)
        .select('name logoUrl coverImageUrl')
        .lean();
      targetName = channel?.name || 'Unknown Channel';
      avatarUrl = channel?.logoUrl;
      thumbnailUrl = channel?.coverImageUrl;
    } else {
      const program = await this.programModel
        .findById(params.targetId)
        .select('channelId title thumbnailUrl')
        .lean();
      if (!program) return { count: 0 };
      channelId = String(program.channelId);
      targetName = program.title;
      const channel = await this.buildChannelContext(channelId);
      avatarUrl = program.thumbnailUrl || channel.avatarUrl;
      thumbnailUrl = program.thumbnailUrl || channel.coverImageUrl;
    }

    const title = params.scheduleTitle || targetName;
    const channel = await this.buildChannelContext(channelId);

    return this.notifyChannelSubscribers({
      channelId,
      type: NotificationType.CHANNEL_NEW_SCHEDULE,
      preferenceKey: 'notifyOnNewProgram',
      title: `New Schedule: ${title}`,
      body: `${channel.name} has a new schedule`,
      data: {
        type: NotificationType.CHANNEL_NEW_SCHEDULE,
        channelId,
        channelSlug: channel.slug,
        scheduleId: params.scheduleId,
        avatarUrl,
        thumbnailUrl,
      },
    });
  }

  async notifyCommentLiked(params: {
    recipientUserId: string;
    actorUserId: string;
    commentId: string;
    videoId: string;
  }) {
    if (params.recipientUserId === params.actorUserId) {
      return { skipped: true };
    }

    await this.createNotification({
      userId: params.recipientUserId,
      type: NotificationType.COMMENT_LIKED,
      title: 'Your comment got a like',
      body: 'Someone liked your comment',
      data: {
        commentId: params.commentId,
        videoId: params.videoId,
      },
    });

    return { skipped: false };
  }

  async notifyCommentReplied(params: {
    recipientUserId: string;
    actorUserId: string;
    commentId: string;
    videoId: string;
    replyId: string;
  }) {
    if (params.recipientUserId === params.actorUserId) {
      return { skipped: true };
    }

    await this.createNotification({
      userId: params.recipientUserId,
      type: NotificationType.COMMENT_REPLIED,
      title: 'New reply to your comment',
      body: 'Someone replied to your comment',
      data: {
        commentId: params.commentId,
        replyId: params.replyId,
        videoId: params.videoId,
      },
    });

    return { skipped: false };
  }

  async notifyCustom(params: {
    title: string;
    body: string;
    userIds: string[];
    data?: Record<string, unknown>;
  }) {
    if (params.userIds.length === 0) {
      return { count: 0 };
    }

    await this.notificationModel.insertMany(
      params.userIds.map((userId) => ({
        userId: new Types.ObjectId(userId),
        type: NotificationType.CUSTOM,
        title: params.title,
        body: params.body,
        data: params.data,
        isRead: false,
      })),
    );

    return { count: params.userIds.length };
  }

  async findCustomNotifications(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const matchStage: Record<string, unknown> = {
      type: NotificationType.CUSTOM,
    };

    if (params.search) {
      matchStage.$or = [
        { title: { $regex: params.search, $options: 'i' } },
        { body: { $regex: params.search, $options: 'i' } },
      ];
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: {
            title: '$title',
            body: '$body',
            createdAt: {
              $dateToString: { format: '%Y-%m-%dT%H:%M', date: '$createdAt' },
            },
          },
          sampleId: { $first: '$_id' },
          title: { $first: '$title' },
          body: { $first: '$body' },
          data: { $first: '$data' },
          recipientCount: { $sum: 1 },
          readCount: {
            $sum: { $cond: ['$isRead', 1, 0] },
          },
          createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { createdAt: -1 as const } },
      {
        $facet: {
          items: [
            { $skip: (params.page - 1) * params.limit },
            { $limit: params.limit },
          ],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.notificationModel.aggregate(pipeline);
    const items = result?.items || [];
    const total = result?.totalCount?.[0]?.count || 0;

    return {
      notifications: items.map((item: any) => ({
        id: item.sampleId.toString(),
        title: item.title,
        body: item.body,
        data: item.data,
        recipientCount: item.recipientCount,
        readCount: item.readCount,
        createdAt: item.createdAt,
      })),
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
    };
  }

  async findCustomNotificationById(id: string) {
    const notification = await this.notificationModel.findById(id).lean();
    if (!notification || notification.type !== NotificationType.CUSTOM) {
      return null;
    }

    const createdAtMinute = new Date(notification.createdAt);
    createdAtMinute.setSeconds(0, 0);
    const nextMinute = new Date(createdAtMinute.getTime() + 60000);

    const stats = await this.notificationModel.aggregate([
      {
        $match: {
          type: NotificationType.CUSTOM,
          title: notification.title,
          body: notification.body,
          createdAt: { $gte: createdAtMinute, $lt: nextMinute },
        },
      },
      {
        $group: {
          _id: null,
          recipientCount: { $sum: 1 },
          readCount: { $sum: { $cond: ['$isRead', 1, 0] } },
        },
      },
    ]);

    const stat = stats[0] || { recipientCount: 0, readCount: 0 };

    return {
      id: notification._id.toString(),
      title: notification.title,
      body: notification.body,
      data: notification.data,
      recipientCount: stat.recipientCount,
      readCount: stat.readCount,
      createdAt: notification.createdAt,
    };
  }

  async deleteCustomNotificationBatch(id: string) {
    const notification = await this.notificationModel.findById(id).lean();
    if (!notification || notification.type !== NotificationType.CUSTOM) {
      return { deletedCount: 0 };
    }

    const createdAtMinute = new Date(notification.createdAt);
    createdAtMinute.setSeconds(0, 0);
    const nextMinute = new Date(createdAtMinute.getTime() + 60000);

    const result = await this.notificationModel.deleteMany({
      type: NotificationType.CUSTOM,
      title: notification.title,
      body: notification.body,
      createdAt: { $gte: createdAtMinute, $lt: nextMinute },
    });

    return { deletedCount: result.deletedCount };
  }

  async notifyAnnouncement(params: {
    title: string;
    body: string;
    userIds: string[];
    data?: Record<string, unknown>;
  }) {
    if (params.userIds.length === 0) {
      return { count: 0 };
    }

    await this.notificationModel.insertMany(
      params.userIds.map((userId) => ({
        userId: new Types.ObjectId(userId),
        type: NotificationType.ANNOUNCEMENT,
        title: params.title,
        body: params.body,
        data: params.data,
        isRead: false,
      })),
    );

    return { count: params.userIds.length };
  }
}

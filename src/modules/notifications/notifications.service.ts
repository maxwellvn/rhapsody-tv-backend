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

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel(ChannelSubscription.name)
    private readonly subscriptionModel: Model<ChannelSubscriptionDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
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

  async notifyNewVideo(params: {
    channelId: string;
    videoId: string;
    videoTitle: string;
  }) {
    const channelName = await this.buildChannelTitle(params.channelId);

    return this.notifyChannelSubscribers({
      channelId: params.channelId,
      type: NotificationType.CHANNEL_NEW_VIDEO,
      preferenceKey: 'notifyOnNewVideo',
      title: `${channelName} uploaded a new video`,
      body: params.videoTitle,
      data: {
        channelId: params.channelId,
        videoId: params.videoId,
      },
    });
  }

  async notifyGoLive(params: {
    channelId: string;
    livestreamId: string;
    livestreamTitle: string;
  }) {
    const channelName = await this.buildChannelTitle(params.channelId);

    return this.notifyChannelSubscribers({
      channelId: params.channelId,
      type: NotificationType.CHANNEL_GO_LIVE,
      preferenceKey: 'notifyOnGoLive',
      title: `${channelName} is live now`,
      body: params.livestreamTitle,
      data: {
        channelId: params.channelId,
        livestreamId: params.livestreamId,
      },
    });
  }

  async notifyNewProgram(params: {
    channelId: string;
    programId: string;
    programTitle: string;
    startTime: string;
  }) {
    const channelName = await this.buildChannelTitle(params.channelId);

    return this.notifyChannelSubscribers({
      channelId: params.channelId,
      type: NotificationType.CHANNEL_NEW_PROGRAM,
      preferenceKey: 'notifyOnNewProgram',
      title: `${channelName} scheduled a program`,
      body: `${params.programTitle} • ${params.startTime}`,
      data: {
        channelId: params.channelId,
        programId: params.programId,
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
}

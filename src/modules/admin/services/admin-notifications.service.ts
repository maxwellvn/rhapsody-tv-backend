import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BroadcastNotification,
  BroadcastNotificationDocument,
  BroadcastTarget,
} from '../../notification/schemas/broadcast-notification.schema';
import { NotificationType } from '../../notification/notification.schema';
import { PushNotificationService } from '../../notification/push-notification.service';
import { Subscription, SubscriptionDocument } from '../../channel/schemas/subscription.schema';
import { ProgramSubscription, ProgramSubscriptionDocument } from '../../channel/schemas/program-subscription.schema';

export interface SendNotificationDto {
  type: NotificationType;
  title: string;
  message: string;
  imageUrl?: string;
  target: BroadcastTarget;
  channelId?: string;
  programId?: string;
  data?: {
    videoId?: string;
    channelId?: string;
    programId?: string;
    livestreamId?: string;
    link?: string;
  };
}

export interface UpdateNotificationDto {
  type?: NotificationType;
  title?: string;
  message?: string;
  imageUrl?: string;
  data?: {
    videoId?: string;
    channelId?: string;
    programId?: string;
    livestreamId?: string;
    link?: string;
  };
}

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    @InjectModel(BroadcastNotification.name)
    private broadcastModel: Model<BroadcastNotificationDocument>,
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(ProgramSubscription.name)
    private programSubscriptionModel: Model<ProgramSubscriptionDocument>,
    private pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Send a broadcast notification
   */
  async sendNotification(
    dto: SendNotificationDto,
    adminUserId?: string,
  ): Promise<BroadcastNotificationDocument> {
    // Create broadcast record
    const broadcast = await this.broadcastModel.create({
      type: dto.type,
      title: dto.title,
      message: dto.message,
      imageUrl: dto.imageUrl,
      target: dto.target,
      channelId: dto.channelId ? new Types.ObjectId(dto.channelId) : undefined,
      programId: dto.programId ? new Types.ObjectId(dto.programId) : undefined,
      data: dto.data,
      sentBy: adminUserId ? new Types.ObjectId(adminUserId) : undefined,
    });

    // Get target users based on target type
    let userIds: string[] = [];

    switch (dto.target) {
      case BroadcastTarget.ALL:
        // For broadcast to all, we use the push service's broadcast method
        const result = await this.pushNotificationService.broadcast({
          title: dto.title,
          body: dto.message,
          data: {
            type: dto.type,
            broadcastId: broadcast._id.toString(),
            ...dto.data,
          },
          imageUrl: dto.imageUrl,
        });

        broadcast.sentCount = result.sent;
        broadcast.failedCount = result.failed;
        broadcast.sentAt = new Date();
        await broadcast.save();

        this.logger.log(`Broadcast sent to all users: ${result.sent} sent, ${result.failed} failed`);
        return broadcast;

      case BroadcastTarget.CHANNEL_SUBSCRIBERS:
        if (dto.channelId) {
          const subscriptions = await this.subscriptionModel.find({
            channelId: new Types.ObjectId(dto.channelId),
          });
          userIds = subscriptions.map((s) => s.userId.toString());
        }
        break;

      case BroadcastTarget.PROGRAM_SUBSCRIBERS:
        if (dto.programId) {
          const subscriptions = await this.programSubscriptionModel.find({
            programId: new Types.ObjectId(dto.programId),
          });
          userIds = subscriptions.map((s) => s.userId.toString());
        }
        break;
    }

    // Send to specific users
    if (userIds.length > 0) {
      await this.pushNotificationService.createAndSendToUsers(
        userIds,
        dto.type,
        dto.title,
        dto.message,
        dto.data,
        dto.imageUrl,
      );

      broadcast.sentCount = userIds.length;
      broadcast.sentAt = new Date();
      await broadcast.save();

      this.logger.log(`Notification sent to ${userIds.length} users`);
    }

    return broadcast;
  }

  /**
   * Get broadcast history
   */
  async getBroadcastHistory(
    page = 1,
    limit = 20,
  ): Promise<{
    broadcasts: BroadcastNotificationDocument[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [broadcasts, total] = await Promise.all([
      this.broadcastModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name')
        .populate('programId', 'title')
        .populate('sentBy', 'fullName email'),
      this.broadcastModel.countDocuments(),
    ]);

    return {
      broadcasts,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a broadcast notification by ID
   */
  async getBroadcastById(id: string): Promise<BroadcastNotificationDocument> {
    const broadcast = await this.broadcastModel
      .findById(id)
      .populate('channelId', 'name')
      .populate('programId', 'title')
      .populate('sentBy', 'fullName email');

    if (!broadcast) {
      throw new Error('Broadcast notification not found');
    }

    return broadcast;
  }

  /**
   * Update a broadcast notification
   */
  async updateBroadcast(
    id: string,
    dto: UpdateNotificationDto,
  ): Promise<BroadcastNotificationDocument> {
    const broadcast = await this.broadcastModel.findByIdAndUpdate(
      id,
      {
        ...(dto.type && { type: dto.type }),
        ...(dto.title && { title: dto.title }),
        ...(dto.message && { message: dto.message }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.data && { data: dto.data }),
      },
      { new: true },
    );

    if (!broadcast) {
      throw new Error('Broadcast notification not found');
    }

    this.logger.log(`Broadcast notification updated: ${id}`);
    return broadcast;
  }

  /**
   * Delete a broadcast notification
   */
  async deleteBroadcast(id: string): Promise<void> {
    const result = await this.broadcastModel.findByIdAndDelete(id);

    if (!result) {
      throw new Error('Broadcast notification not found');
    }

    this.logger.log(`Broadcast notification deleted: ${id}`);
  }

  /**
   * Notify channel subscribers about new video
   */
  async notifyNewVideo(
    channelId: string,
    videoId: string,
    videoTitle: string,
    channelName: string,
    thumbnailUrl?: string,
  ): Promise<void> {
    const subscriptions = await this.subscriptionModel.find({
      channelId: new Types.ObjectId(channelId),
    });

    if (subscriptions.length === 0) return;

    const userIds = subscriptions.map((s) => s.userId.toString());

    await this.pushNotificationService.createAndSendToUsers(
      userIds,
      NotificationType.NEW_VIDEO,
      `${channelName} uploaded a new video`,
      videoTitle,
      { videoId, channelId },
      thumbnailUrl,
    );

    this.logger.log(`Notified ${userIds.length} subscribers about new video: ${videoTitle}`);
  }

  /**
   * Notify channel subscribers about new livestream
   */
  async notifyNewLivestream(
    channelId: string,
    livestreamId: string,
    livestreamTitle: string,
    channelName: string,
    thumbnailUrl?: string,
    isLive = false,
  ): Promise<void> {
    const subscriptions = await this.subscriptionModel.find({
      channelId: new Types.ObjectId(channelId),
    });

    if (subscriptions.length === 0) return;

    const userIds = subscriptions.map((s) => s.userId.toString());
    const type = isLive ? NotificationType.LIVESTREAM_LIVE : NotificationType.NEW_LIVESTREAM;
    const title = isLive
      ? `${channelName} is now LIVE!`
      : `${channelName} scheduled a new livestream`;

    await this.pushNotificationService.createAndSendToUsers(
      userIds,
      type,
      title,
      livestreamTitle,
      { livestreamId, channelId },
      thumbnailUrl,
    );

    this.logger.log(`Notified ${userIds.length} subscribers about livestream: ${livestreamTitle}`);
  }

  /**
   * Notify about new channel
   */
  async notifyNewChannel(
    channelId: string,
    channelName: string,
    description?: string,
    logoUrl?: string,
  ): Promise<void> {
    await this.pushNotificationService.broadcastNotification(
      NotificationType.NEW_CHANNEL,
      'New Channel Available!',
      `Check out ${channelName}${description ? `: ${description.substring(0, 50)}...` : ''}`,
      { channelId },
      logoUrl,
    );

    this.logger.log(`Broadcasted new channel notification: ${channelName}`);
  }

  /**
   * Notify about new program
   */
  async notifyNewProgram(
    channelId: string,
    programId: string,
    programTitle: string,
    channelName: string,
    thumbnailUrl?: string,
  ): Promise<void> {
    // Notify channel subscribers
    const subscriptions = await this.subscriptionModel.find({
      channelId: new Types.ObjectId(channelId),
    });

    if (subscriptions.length === 0) return;

    const userIds = subscriptions.map((s) => s.userId.toString());

    await this.pushNotificationService.createAndSendToUsers(
      userIds,
      NotificationType.NEW_PROGRAM,
      `${channelName} has a new program`,
      programTitle,
      { programId, channelId },
      thumbnailUrl,
    );

    this.logger.log(`Notified ${userIds.length} subscribers about new program: ${programTitle}`);
  }

  /**
   * Notify program subscribers about upcoming show (scheduled)
   */
  async notifyProgramStartingSoon(
    programId: string,
    programTitle: string,
    startTime: Date,
    livestreamId?: string,
    thumbnailUrl?: string,
  ): Promise<void> {
    const subscriptions = await this.programSubscriptionModel.find({
      programId: new Types.ObjectId(programId),
    });

    if (subscriptions.length === 0) return;

    const userIds = subscriptions.map((s) => s.userId.toString());
    const minutesUntilStart = Math.round(
      (startTime.getTime() - Date.now()) / (1000 * 60),
    );

    await this.pushNotificationService.createAndSendToUsers(
      userIds,
      NotificationType.PROGRAM_STARTING,
      `${programTitle} starts in ${minutesUntilStart} minutes!`,
      'Tap to watch',
      { programId, livestreamId },
      thumbnailUrl,
    );

    this.logger.log(`Notified ${userIds.length} subscribers about program starting: ${programTitle}`);
  }
}

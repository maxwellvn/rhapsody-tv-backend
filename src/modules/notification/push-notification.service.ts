import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DeviceToken, DeviceTokenDocument } from './schemas/device-token.schema';
import { Notification, NotificationDocument, NotificationType } from './notification.schema';
import { NotificationGateway } from './notification.gateway';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private expo: Expo;

  constructor(
    @InjectModel(DeviceToken.name)
    private deviceTokenModel: Model<DeviceTokenDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @Inject(forwardRef(() => NotificationGateway))
    private notificationGateway: NotificationGateway,
  ) {
    this.expo = new Expo();
  }

  /**
   * Register a device token for push notifications
   */
  async registerToken(
    userId: string,
    token: string,
    platform: string = 'expo',
    deviceId?: string,
  ): Promise<DeviceTokenDocument> {
    // Validate Expo push token
    if (!Expo.isExpoPushToken(token)) {
      this.logger.warn(`Invalid Expo push token: ${token}`);
    }

    // Upsert the token
    const result = await this.deviceTokenModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), token },
      {
        userId: new Types.ObjectId(userId),
        token,
        platform,
        deviceId,
        isActive: true,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Registered push token for user ${userId}`);
    return result;
  }

  /**
   * Unregister a device token
   */
  async unregisterToken(userId: string, token: string): Promise<void> {
    await this.deviceTokenModel.deleteOne({
      userId: new Types.ObjectId(userId),
      token,
    });
    this.logger.log(`Unregistered push token for user ${userId}`);
  }

  /**
   * Get all active tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const tokens = await this.deviceTokenModel.find({
      userId: new Types.ObjectId(userId),
      isActive: true,
    });
    return tokens.map((t) => t.token);
  }

  /**
   * Get tokens for multiple users
   */
  async getTokensForUsers(userIds: string[]): Promise<string[]> {
    const tokens = await this.deviceTokenModel.find({
      userId: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      isActive: true,
    });
    return tokens.map((t) => t.token);
  }

  /**
   * Get all active tokens (for broadcast)
   */
  async getAllActiveTokens(): Promise<string[]> {
    const tokens = await this.deviceTokenModel.find({ isActive: true });
    return tokens.map((t) => t.token);
  }

  /**
   * Send push notification to specific users
   */
  async sendToUsers(
    userIds: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
      imageUrl?: string;
    },
  ): Promise<void> {
    const tokens = await this.getTokensForUsers(userIds);
    if (tokens.length === 0) {
      this.logger.log('No tokens found for users');
      return;
    }

    await this.sendPushNotifications(tokens, notification);
  }

  /**
   * Send push notification to a single user
   */
  async sendToUser(
    userId: string,
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
      imageUrl?: string;
    },
  ): Promise<void> {
    const tokens = await this.getUserTokens(userId);
    if (tokens.length === 0) {
      this.logger.log(`No tokens found for user ${userId}`);
      return;
    }

    await this.sendPushNotifications(tokens, notification);
  }

  /**
   * Broadcast push notification to all users
   */
  async broadcast(notification: {
    title: string;
    body: string;
    data?: Record<string, any>;
    imageUrl?: string;
  }): Promise<{ sent: number; failed: number }> {
    const tokens = await this.getAllActiveTokens();
    if (tokens.length === 0) {
      this.logger.log('No active tokens for broadcast');
      return { sent: 0, failed: 0 };
    }

    return this.sendPushNotifications(tokens, notification);
  }

  /**
   * Send push notifications using Expo
   */
  private async sendPushNotifications(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      data?: Record<string, any>;
      imageUrl?: string;
    },
  ): Promise<{ sent: number; failed: number }> {
    // Filter valid Expo push tokens
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      this.logger.warn('No valid Expo push tokens');
      return { sent: 0, failed: tokens.length };
    }

    // Create messages
    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      sound: 'default',
      title: notification.title,
      body: notification.body,
      data: notification.data || {},
      channelId: 'default',
      priority: 'high',
    }));

    // Send in chunks (Expo recommends max 100 per request)
    const chunks = this.expo.chunkPushNotifications(messages);
    let sent = 0;
    let failed = 0;

    for (const chunk of chunks) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        
        // Process tickets
        for (let i = 0; i < tickets.length; i++) {
          const ticket = tickets[i];
          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            // Handle invalid tokens
            if (ticket.details?.error === 'DeviceNotRegistered') {
              const token = chunk[i].to as string;
              await this.deviceTokenModel.updateOne(
                { token },
                { isActive: false },
              );
              this.logger.log(`Deactivated invalid token: ${token}`);
            }
          }
        }
      } catch (error) {
        this.logger.error('Error sending push notifications:', error);
        failed += chunk.length;
      }
    }

    this.logger.log(`Push notifications sent: ${sent}, failed: ${failed}`);
    return { sent, failed };
  }

  /**
   * Create in-app notification and send push
   */
  async createAndSendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: {
      videoId?: string;
      channelId?: string;
      programId?: string;
      livestreamId?: string;
    },
    imageUrl?: string,
  ): Promise<NotificationDocument> {
    // Create in-app notification
    const notification = await this.notificationModel.create({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      data,
      imageUrl,
    });

    // Send via WebSocket (real-time, works in Expo Go)
    this.notificationGateway.sendNotificationToUser(userId, {
      _id: notification._id.toString(),
      type,
      title,
      message,
      data,
      imageUrl,
      isRead: false,
      createdAt: notification.createdAt,
    });

    // Send push notification (for native builds)
    await this.sendToUser(userId, {
      title,
      body: message,
      data: {
        type,
        notificationId: notification._id.toString(),
        ...data,
      },
      imageUrl,
    });

    return notification;
  }

  /**
   * Create notifications for multiple users and send push
   */
  async createAndSendToUsers(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: {
      videoId?: string;
      channelId?: string;
      programId?: string;
      livestreamId?: string;
    },
    imageUrl?: string,
  ): Promise<void> {
    // Create in-app notifications for all users
    const notifications = userIds.map((userId) => ({
      userId: new Types.ObjectId(userId),
      type,
      title,
      message,
      data,
      imageUrl,
    }));

    const createdNotifications = await this.notificationModel.insertMany(notifications);

    // Send via WebSocket to all users (real-time, works in Expo Go)
    const notificationPayload = {
      type,
      title,
      message,
      data,
      imageUrl,
      isRead: false,
      createdAt: new Date(),
    };
    
    // Send to each user with their specific notification ID
    createdNotifications.forEach((notification, index) => {
      this.notificationGateway.sendNotificationToUser(userIds[index], {
        _id: notification._id.toString(),
        ...notificationPayload,
      });
    });

    // Send push notifications (for native builds)
    await this.sendToUsers(userIds, {
      title,
      body: message,
      data: { type, ...data },
      imageUrl,
    });
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(
    type: NotificationType,
    title: string,
    message: string,
    data?: {
      videoId?: string;
      channelId?: string;
      programId?: string;
      livestreamId?: string;
    },
    imageUrl?: string,
  ): Promise<{ sent: number; failed: number }> {
    // Broadcast via WebSocket to all connected users (real-time, works in Expo Go)
    this.notificationGateway.broadcastNotification({
      type,
      title,
      message,
      data,
      imageUrl,
      isRead: false,
      createdAt: new Date(),
    });

    // For broadcast, we create notifications when users fetch them
    // Send push notifications (for native builds)
    return this.broadcast({
      title,
      body: message,
      data: { type, ...data },
      imageUrl,
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './notification.schema';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  /**
   * Create a notification
   */
  async create(data: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    imageUrl?: string;
    data?: {
      videoId?: string;
      channelId?: string;
      programId?: string;
      livestreamId?: string;
      commentId?: string;
    };
  }): Promise<NotificationDocument> {
    return this.notificationModel.create({
      ...data,
      userId: new Types.ObjectId(data.userId),
    });
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    notifications: any[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const userObjectId = new Types.ObjectId(userId);

    const [notifications, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments({ userId: userObjectId }),
      this.notificationModel.countDocuments({ userId: userObjectId, isRead: false }),
    ]);

    // Transform notifications to expected format
    const transformedNotifications = notifications.map((n: any) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      thumbnail: n.imageUrl,
      isRead: n.isRead,
      createdAt: n.createdAt,
      // Flatten data fields
      videoId: n.data?.videoId,
      channelId: n.data?.channelId,
      programId: n.data?.programId,
      livestreamId: n.data?.livestreamId,
      commentId: n.data?.commentId,
    }));

    return {
      notifications: transformedNotifications,
      total,
      unreadCount,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new NotFoundException('Invalid notification ID');
    }

    const result = await this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { isRead: true },
    );

    if (!result) {
      throw new NotFoundException('Notification not found');
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { isRead: true },
    );
  }

  /**
   * Delete a notification
   */
  async delete(userId: string, notificationId: string): Promise<void> {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(notificationId)) {
      throw new NotFoundException('Invalid notification ID');
    }

    const result = await this.notificationModel.findOneAndDelete({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });

    if (!result) {
      throw new NotFoundException('Notification not found');
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }
}

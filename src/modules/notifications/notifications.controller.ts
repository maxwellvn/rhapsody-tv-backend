import { Controller, Get, Patch, Param, Query, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import { Notification, NotificationDocument } from './schemas';
import { PaginatedNotificationsDto } from './dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get my notifications (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Notifications retrieved successfully',
    model: PaginatedNotificationsDto,
  })
  async getMyNotifications(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const filter = { userId: new Types.ObjectId(userId) };

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: notifications.map((n) => ({
          id: n._id.toString(),
          type: n.type,
          title: n.title,
          body: n.body,
          data: n.data,
          isRead: n.isRead,
          createdAt: (n as NotificationDocument & { createdAt?: Date })
            .createdAt
            ? (
                n as NotificationDocument & { createdAt?: Date }
              ).createdAt!.toISOString()
            : new Date().toISOString(),
        })),
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  @Patch(':notificationId/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiOkSuccessResponse({ description: 'Notification marked as read' })
  async markRead(
    @CurrentUser('sub') userId: string,
    @Param('notificationId') notificationId: string,
  ) {
    await this.notificationModel.updateOne(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
    );

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkSuccessResponse({ description: 'Notifications marked as read' })
  async markAllRead(@CurrentUser('sub') userId: string) {
    await this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );

    return {
      success: true,
      message: 'Notifications marked as read',
    };
  }
}

import { Controller, Get, Post, Delete, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import type { UserDocument } from '../user/schemas/user.schema';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({ description: 'Notifications retrieved successfully' })
  async getNotifications(
    @CurrentUser() user: UserDocument,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.notificationService.getNotifications(
      user._id.toString(),
      Number(page),
      Number(limit),
    );

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data: result,
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkSuccessResponse({ description: 'Unread count retrieved successfully' })
  async getUnreadCount(@CurrentUser() user: UserDocument) {
    const count = await this.notificationService.getUnreadCount(user._id.toString());

    return {
      success: true,
      message: 'Unread count retrieved successfully',
      data: { count },
    };
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiOkSuccessResponse({ description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    await this.notificationService.markAsRead(user._id.toString(), id);

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkSuccessResponse({ description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: UserDocument) {
    await this.notificationService.markAllAsRead(user._id.toString());

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiOkSuccessResponse({ description: 'Notification deleted successfully' })
  async delete(
    @CurrentUser() user: UserDocument,
    @Param('id') id: string,
  ) {
    await this.notificationService.delete(user._id.toString(), id);

    return {
      success: true,
      message: 'Notification deleted successfully',
    };
  }
}

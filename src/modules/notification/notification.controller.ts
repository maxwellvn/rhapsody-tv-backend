import { Controller, Get, Post, Delete, Param, Query, Body, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationPreferencesService, UpdateNotificationPreferencesDto } from './notification-preferences.service';
import { CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import type { UserDocument } from '../user/schemas/user.schema';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class RegisterTokenDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  platform?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;
}

class UpdatePreferencesDto implements UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  subscriptions?: boolean;

  @IsOptional()
  @IsBoolean()
  recommendedVideos?: boolean;

  @IsOptional()
  @IsBoolean()
  commentActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  newChannels?: boolean;

  @IsOptional()
  @IsBoolean()
  livestreams?: boolean;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushNotificationService: PushNotificationService,
    private readonly preferencesService: NotificationPreferencesService,
  ) {}

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

  @Post('register-token')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiOkSuccessResponse({ description: 'Token registered successfully' })
  async registerToken(
    @CurrentUser() user: UserDocument,
    @Body() dto: RegisterTokenDto,
  ) {
    await this.pushNotificationService.registerToken(
      user._id.toString(),
      dto.token,
      dto.platform || 'expo',
      dto.deviceId,
    );

    return {
      success: true,
      message: 'Push notification token registered successfully',
    };
  }

  @Post('unregister-token')
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiOkSuccessResponse({ description: 'Token unregistered successfully' })
  async unregisterToken(
    @CurrentUser() user: UserDocument,
    @Body() dto: { token: string },
  ) {
    await this.pushNotificationService.unregisterToken(
      user._id.toString(),
      dto.token,
    );

    return {
      success: true,
      message: 'Push notification token unregistered successfully',
    };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiOkSuccessResponse({ description: 'Preferences retrieved successfully' })
  async getPreferences(@CurrentUser() user: UserDocument) {
    const preferences = await this.preferencesService.getPreferences(user._id.toString());

    return {
      success: true,
      message: 'Notification preferences retrieved successfully',
      data: {
        subscriptions: preferences.subscriptions,
        recommendedVideos: preferences.recommendedVideos,
        commentActivity: preferences.commentActivity,
        newChannels: preferences.newChannels,
        livestreams: preferences.livestreams,
      },
    };
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiOkSuccessResponse({ description: 'Preferences updated successfully' })
  async updatePreferences(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const preferences = await this.preferencesService.updatePreferences(
      user._id.toString(),
      dto,
    );

    return {
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        subscriptions: preferences.subscriptions,
        recommendedVideos: preferences.recommendedVideos,
        commentActivity: preferences.commentActivity,
        newChannels: preferences.newChannels,
        livestreams: preferences.livestreams,
      },
    };
  }
}

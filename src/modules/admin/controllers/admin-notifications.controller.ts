import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminNotificationsService, SendNotificationDto, UpdateNotificationDto } from '../services/admin-notifications.service';
import { CurrentUser, Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import type { UserDocument } from '../../user/schemas/user.schema';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { NotificationType } from '../../notification/notification.schema';
import { BroadcastTarget } from '../../notification/schemas/broadcast-notification.schema';

class CreateNotificationDto implements SendNotificationDto {
  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsEnum(BroadcastTarget)
  target: BroadcastTarget;

  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsString()
  programId?: string;

  @IsOptional()
  @IsObject()
  data?: {
    videoId?: string;
    channelId?: string;
    programId?: string;
    livestreamId?: string;
    link?: string;
  };
}

class UpdateNotificationBodyDto implements UpdateNotificationDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsObject()
  data?: {
    videoId?: string;
    channelId?: string;
    programId?: string;
    livestreamId?: string;
    link?: string;
  };
}

@ApiTags('Admin - Notifications')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notificationsService: AdminNotificationsService) {}

  @Post('send')
  @ApiOperation({ summary: 'Send a notification to users' })
  async sendNotification(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() user: UserDocument,
  ) {
    const broadcast = await this.notificationsService.sendNotification(
      dto,
      user._id.toString(),
    );

    return {
      success: true,
      message: 'Notification sent successfully',
      data: {
        id: broadcast._id,
        sentCount: broadcast.sentCount,
        failedCount: broadcast.failedCount,
        sentAt: broadcast.sentAt,
      },
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get broadcast notification history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getBroadcastHistory(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.notificationsService.getBroadcastHistory(
      Number(page),
      Number(limit),
    );

    return {
      success: true,
      message: 'Broadcast history retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a broadcast notification by ID' })
  async getBroadcastById(@Param('id') id: string) {
    const broadcast = await this.notificationsService.getBroadcastById(id);

    return {
      success: true,
      message: 'Broadcast notification retrieved successfully',
      data: broadcast,
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a broadcast notification' })
  async updateBroadcast(
    @Param('id') id: string,
    @Body() dto: UpdateNotificationBodyDto,
  ) {
    const broadcast = await this.notificationsService.updateBroadcast(id, dto);

    return {
      success: true,
      message: 'Broadcast notification updated successfully',
      data: broadcast,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a broadcast notification' })
  async deleteBroadcast(@Param('id') id: string) {
    await this.notificationsService.deleteBroadcast(id);

    return {
      success: true,
      message: 'Broadcast notification deleted successfully',
    };
  }
}

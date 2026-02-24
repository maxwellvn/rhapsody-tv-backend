import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import { ApiCreatedSuccessResponse } from '../../../common/swagger';
import {
  CreateAnnouncementDto,
  CreateCustomNotificationDto,
} from '../dto/notifications';
import { AdminNotificationsService } from '../services/admin-notifications.service';

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly adminNotificationsService: AdminNotificationsService,
  ) {}

  @Post('announcements')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create and broadcast custom announcement' })
  @ApiCreatedSuccessResponse({
    description: 'Announcement notifications created successfully',
  })
  async createAnnouncement(@Body() dto: CreateAnnouncementDto) {
    const result = await this.adminNotificationsService.createAnnouncement(dto);
    return {
      success: true,
      message: 'Announcement notifications created successfully',
      data: result,
    };
  }

  @Post('custom')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create and send a custom notification' })
  @ApiCreatedSuccessResponse({
    description: 'Custom notifications created successfully',
  })
  async createCustomNotification(@Body() dto: CreateCustomNotificationDto) {
    const result =
      await this.adminNotificationsService.createCustomNotification(dto);
    return {
      success: true,
      message: 'Custom notifications created successfully',
      data: result,
    };
  }

  @Get('custom')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List custom notifications' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async listCustomNotifications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result =
      await this.adminNotificationsService.listCustomNotifications({
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 20,
        search: search || undefined,
      });
    return {
      success: true,
      data: result,
    };
  }

  @Get('custom/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get custom notification details' })
  async getCustomNotification(@Param('id') id: string) {
    const result =
      await this.adminNotificationsService.getCustomNotificationById(id);
    return {
      success: true,
      data: result,
    };
  }

  @Delete('custom/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a custom notification batch' })
  async deleteCustomNotification(@Param('id') id: string) {
    const result =
      await this.adminNotificationsService.deleteCustomNotification(id);
    return {
      success: true,
      message: 'Custom notification batch deleted successfully',
      data: result,
    };
  }
}

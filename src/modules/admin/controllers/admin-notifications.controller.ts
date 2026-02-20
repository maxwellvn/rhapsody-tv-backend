import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import { ApiCreatedSuccessResponse } from '../../../common/swagger';
import { CreateAnnouncementDto } from '../dto/notifications';
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
}

import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { Role } from '../../shared/enums/role.enum';
import { SyncService } from './sync.service';

@ApiTags('Admin Sync')
@ApiBearerAuth()
@Controller('admin/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('content')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sync all RTV content (categories + videos)' })
  async syncContent() {
    const result = await this.syncService.syncContent();
    return {
      success: true,
      message: 'Content sync completed',
      data: result,
    };
  }

  @Post('schedule')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sync RTV weekly schedule' })
  async syncSchedule() {
    const result = await this.syncService.syncSchedule();
    return {
      success: true,
      message: 'Schedule sync completed',
      data: result,
    };
  }

  @Get('status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get current sync status' })
  async getStatus() {
    return {
      success: true,
      message: 'Sync status retrieved',
      data: this.syncService.getStatus(),
    };
  }
}

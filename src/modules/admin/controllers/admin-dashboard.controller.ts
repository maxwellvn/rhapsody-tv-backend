import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import { ApiOkSuccessResponse } from '../../../common/swagger';
import {
  AdminDashboardEngagementResponseDto,
  AdminDashboardOverviewResponseDto,
} from '../dto';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard overview stats' })
  @ApiOkSuccessResponse({
    description: 'Dashboard overview retrieved successfully',
    model: AdminDashboardOverviewResponseDto,
  })
  async getOverview() {
    const data = await this.dashboardService.getOverview();
    return {
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data,
    };
  }

  @Get('engagement')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard engagement stats' })
  @ApiOkSuccessResponse({
    description: 'Dashboard engagement retrieved successfully',
    model: AdminDashboardEngagementResponseDto,
  })
  async getEngagement() {
    const data = await this.dashboardService.getEngagement();
    return {
      success: true,
      message: 'Dashboard engagement retrieved successfully',
      data,
    };
  }
}

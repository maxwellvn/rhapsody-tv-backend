import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators';
import { Role } from '../../shared/enums/role.enum';
import { DonationsService } from './donations.service';

@ApiTags('Admin Donations')
@ApiBearerAuth()
@Controller('admin/donations')
export class AdminDonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all donations (paginated, with filters)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'method', required: false, enum: ['stripe', 'espees'] })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'completed', 'failed', 'refunded'],
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('method') method?: string,
    @Query('status') status?: string,
  ) {
    const data = await this.donationsService.findAll(page, limit, method, status);
    return {
      success: true,
      message: 'Donations retrieved successfully',
      data,
    };
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get donation statistics' })
  async getStats() {
    const data = await this.donationsService.getStats();
    return {
      success: true,
      message: 'Donation stats retrieved successfully',
      data,
    };
  }
}

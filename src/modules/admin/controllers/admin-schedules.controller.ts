import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminSchedulesService } from '../services/admin-schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from '../dto/schedules';
import {
  ScheduleResponseDto,
  PaginatedSchedulesResponseDto,
} from '../dto';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../../common/swagger';
import {
  ScheduleTargetType,
  ScheduleType,
} from '../../channel/schemas/schedule.schema';

@ApiTags('Admin Schedules')
@ApiBearerAuth()
@Controller('admin/schedules')
export class AdminSchedulesController {
  constructor(
    private readonly adminSchedulesService: AdminSchedulesService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new schedule (Admin only)' })
  @ApiCreatedSuccessResponse({
    description: 'Schedule created successfully',
    model: ScheduleResponseDto,
  })
  async create(@Body() createScheduleDto: CreateScheduleDto) {
    const schedule =
      await this.adminSchedulesService.create(createScheduleDto);
    return {
      success: true,
      message: 'Schedule created successfully',
      data: schedule,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all schedules (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'targetType',
    required: false,
    enum: ScheduleTargetType,
  })
  @ApiQuery({
    name: 'scheduleType',
    required: false,
    enum: ScheduleType,
  })
  @ApiOkSuccessResponse({
    description: 'Schedules retrieved successfully',
    model: PaginatedSchedulesResponseDto,
  })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('targetType') targetType?: ScheduleTargetType,
    @Query('scheduleType') scheduleType?: ScheduleType,
  ) {
    const result = await this.adminSchedulesService.findAll({
      page,
      limit,
      search,
      sortBy,
      sortOrder,
      targetType,
      scheduleType,
    });
    return {
      success: true,
      message: 'Schedules retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get schedule by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Schedule retrieved successfully',
    model: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async findOne(@Param('id') id: string) {
    const schedule = await this.adminSchedulesService.findById(id);
    return {
      success: true,
      message: 'Schedule retrieved successfully',
      data: schedule,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update schedule by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Schedule updated successfully',
    model: ScheduleResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ) {
    const schedule = await this.adminSchedulesService.update(
      id,
      updateScheduleDto,
    );
    return {
      success: true,
      message: 'Schedule updated successfully',
      data: schedule,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete schedule by ID (Admin only)' })
  @ApiOkSuccessResponse({ description: 'Schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  async remove(@Param('id') id: string) {
    await this.adminSchedulesService.remove(id);
    return {
      success: true,
      message: 'Schedule deleted successfully',
    };
  }
}

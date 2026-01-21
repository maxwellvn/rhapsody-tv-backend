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
import { AdminProgramsService } from '../services/admin-programs.service';
import { CreateProgramDto, UpdateProgramDto } from '../dto/programs';
import { ProgramResponseDto, PaginatedProgramsResponseDto } from '../dto';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../../common/swagger';
import { ScheduleType } from '../../channel/schemas/program.schema';

@ApiTags('Admin Programs')
@ApiBearerAuth()
@Controller('admin/programs')
export class AdminProgramsController {
  constructor(private readonly adminProgramsService: AdminProgramsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new program (Admin only)' })
  @ApiCreatedSuccessResponse({
    description: 'Program created successfully',
    model: ProgramResponseDto,
  })
  async create(@Body() createProgramDto: CreateProgramDto) {
    const program = await this.adminProgramsService.create(createProgramDto);
    return {
      success: true,
      message: 'Program created successfully',
      data: program,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all programs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ 
    name: 'scheduleType', 
    required: false, 
    enum: ScheduleType,
    description: 'Filter by schedule type (daily, weekly, once)',
  })
  @ApiOkSuccessResponse({
    description: 'Programs retrieved successfully',
    model: PaginatedProgramsResponseDto,
  })
  async findAll(
    @Query('page') page?: number, 
    @Query('limit') limit?: number,
    @Query('scheduleType') scheduleType?: ScheduleType,
  ) {
    const result = await this.adminProgramsService.findAll(page, limit, scheduleType);
    return {
      success: true,
      message: 'Programs retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get program by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Program retrieved successfully',
    model: ProgramResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async findOne(@Param('id') id: string) {
    const program = await this.adminProgramsService.findById(id);
    return {
      success: true,
      message: 'Program retrieved successfully',
      data: program,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update program by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Program updated successfully',
    model: ProgramResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async update(
    @Param('id') id: string,
    @Body() updateProgramDto: UpdateProgramDto,
  ) {
    const program = await this.adminProgramsService.update(
      id,
      updateProgramDto,
    );
    return {
      success: true,
      message: 'Program updated successfully',
      data: program,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete program by ID (Admin only)' })
  @ApiOkSuccessResponse({ description: 'Program deleted successfully' })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async remove(@Param('id') id: string) {
    await this.adminProgramsService.remove(id);
    return {
      success: true,
      message: 'Program deleted successfully',
    };
  }
}

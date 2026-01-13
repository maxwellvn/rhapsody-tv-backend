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
import { AdminLivestreamsService } from '../services/admin-livestreams.service';
import {
  CreateLivestreamDto,
  UpdateLivestreamDto,
  UpdateLivestreamStatusDto,
} from '../dto/livestreams';
import { LivestreamResponseDto, PaginatedLivestreamsResponseDto } from '../dto';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../../common/swagger';

@ApiTags('Admin Livestreams')
@ApiBearerAuth()
@Controller('admin/livestreams')
export class AdminLivestreamsController {
  constructor(
    private readonly adminLivestreamsService: AdminLivestreamsService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new livestream (Admin only)' })
  @ApiCreatedSuccessResponse({
    description: 'Livestream created successfully',
    model: LivestreamResponseDto,
  })
  async create(@Body() createLivestreamDto: CreateLivestreamDto) {
    const livestream =
      await this.adminLivestreamsService.create(createLivestreamDto);
    return {
      success: true,
      message: 'Livestream created successfully',
      data: livestream,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all livestreams (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Livestreams retrieved successfully',
    model: PaginatedLivestreamsResponseDto,
  })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.adminLivestreamsService.findAll(page, limit);
    return {
      success: true,
      message: 'Livestreams retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get livestream by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Livestream retrieved successfully',
    model: LivestreamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Livestream not found' })
  async findOne(@Param('id') id: string) {
    const livestream = await this.adminLivestreamsService.findById(id);
    return {
      success: true,
      message: 'Livestream retrieved successfully',
      data: livestream,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update livestream by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Livestream updated successfully',
    model: LivestreamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Livestream not found' })
  async update(
    @Param('id') id: string,
    @Body() updateLivestreamDto: UpdateLivestreamDto,
  ) {
    const livestream = await this.adminLivestreamsService.update(
      id,
      updateLivestreamDto,
    );
    return {
      success: true,
      message: 'Livestream updated successfully',
      data: livestream,
    };
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update livestream status (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Livestream status updated successfully',
    model: LivestreamResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Livestream not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateLivestreamStatusDto,
  ) {
    const livestream = await this.adminLivestreamsService.updateStatus(
      id,
      updateStatusDto,
    );
    return {
      success: true,
      message: 'Livestream status updated successfully',
      data: livestream,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete livestream by ID (Admin only)' })
  @ApiOkSuccessResponse({ description: 'Livestream deleted successfully' })
  @ApiResponse({ status: 404, description: 'Livestream not found' })
  async remove(@Param('id') id: string) {
    await this.adminLivestreamsService.remove(id);
    return {
      success: true,
      message: 'Livestream deleted successfully',
    };
  }
}

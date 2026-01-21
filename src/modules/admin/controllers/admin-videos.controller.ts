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
import { AdminVideosService } from '../services/admin-videos.service';
import { CreateVideoDto, UpdateVideoDto } from '../dto/videos';
import { VideoResponseDto, PaginatedVideosResponseDto } from '../dto';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../../common/swagger';

@ApiTags('Admin Videos')
@ApiBearerAuth()
@Controller('admin/videos')
export class AdminVideosController {
  constructor(private readonly adminVideosService: AdminVideosService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new video (Admin only)' })
  @ApiCreatedSuccessResponse({
    description: 'Video created successfully',
    model: VideoResponseDto,
  })
  async create(@Body() createVideoDto: CreateVideoDto) {
    const video = await this.adminVideosService.create(createVideoDto);
    return {
      success: true,
      message: 'Video created successfully',
      data: video,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all videos (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Videos retrieved successfully',
    model: PaginatedVideosResponseDto,
  })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.adminVideosService.findAll(page, limit);
    return {
      success: true,
      message: 'Videos retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get video by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Video retrieved successfully',
    model: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async findOne(@Param('id') id: string) {
    const video = await this.adminVideosService.findById(id);
    return {
      success: true,
      message: 'Video retrieved successfully',
      data: video,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update video by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Video updated successfully',
    model: VideoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async update(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
  ) {
    const video = await this.adminVideosService.update(id, updateVideoDto);
    return {
      success: true,
      message: 'Video updated successfully',
      data: video,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete video by ID (Admin only)' })
  @ApiOkSuccessResponse({ description: 'Video deleted successfully' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async remove(@Param('id') id: string) {
    await this.adminVideosService.remove(id);
    return {
      success: true,
      message: 'Video deleted successfully',
    };
  }
}

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
import { AdminChannelsService } from '../services/admin-channels.service';
import { CreateChannelDto, UpdateChannelDto } from '../dto/channels';
import { ChannelResponseDto, PaginatedChannelsResponseDto } from '../dto';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../../common/swagger';

@ApiTags('Admin Channels')
@ApiBearerAuth()
@Controller('admin/channels')
export class AdminChannelsController {
  constructor(private readonly adminChannelsService: AdminChannelsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new channel (Admin only)' })
  @ApiCreatedSuccessResponse({
    description: 'Channel created successfully',
    model: ChannelResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Channel with this slug already exists',
  })
  async create(@Body() createChannelDto: CreateChannelDto) {
    const channel = await this.adminChannelsService.create(createChannelDto);
    return {
      success: true,
      message: 'Channel created successfully',
      data: channel,
    };
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all channels (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Channels retrieved successfully',
    model: PaginatedChannelsResponseDto,
  })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.adminChannelsService.findAll(page, limit);
    return {
      success: true,
      message: 'Channels retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get channel by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Channel retrieved successfully',
    model: ChannelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOne(@Param('id') id: string) {
    const channel = await this.adminChannelsService.findById(id);
    return {
      success: true,
      message: 'Channel retrieved successfully',
      data: channel,
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update channel by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Channel updated successfully',
    model: ChannelResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async update(
    @Param('id') id: string,
    @Body() updateChannelDto: UpdateChannelDto,
  ) {
    const channel = await this.adminChannelsService.update(
      id,
      updateChannelDto,
    );
    return {
      success: true,
      message: 'Channel updated successfully',
      data: channel,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete channel by ID (Admin only)' })
  @ApiOkSuccessResponse({ description: 'Channel deleted successfully' })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async remove(@Param('id') id: string) {
    await this.adminChannelsService.remove(id);
    return {
      success: true,
      message: 'Channel deleted successfully',
    };
  }
}

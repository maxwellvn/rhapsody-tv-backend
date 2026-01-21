import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { LivestreamService } from './services/livestream.service';
import { LiveStreamStatus } from './schemas/live-stream.schema';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Livestreams')
@Controller('livestreams')
export class LivestreamController {
  constructor(private readonly livestreamService: LivestreamService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active livestreams' })
  @ApiQuery({ name: 'status', required: false, enum: LiveStreamStatus })
  @ApiQuery({ name: 'channelId', required: false })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getLivestreams(
    @Query('status') status?: LiveStreamStatus,
    @Query('channelId') channelId?: string,
    @Query('programId') programId?: string,
    @Query('limit') limit?: string,
  ) {
    const livestreams = await this.livestreamService.getLivestreams({
      status,
      channelId,
      programId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: { livestreams },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Get currently live streams' })
  async getLiveNow() {
    const livestreams = await this.livestreamService.getLiveNow();

    return {
      success: true,
      data: { livestreams },
    };
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming scheduled livestreams' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUpcoming(@Query('limit') limit?: string) {
    const livestreams = await this.livestreamService.getUpcoming(
      limit ? parseInt(limit, 10) : 10,
    );

    return {
      success: true,
      data: { livestreams },
    };
  }

  @Get('channel/:channelId')
  @ApiOperation({ summary: 'Get livestreams by channel' })
  @ApiParam({ name: 'channelId' })
  @ApiQuery({ name: 'includeEnded', required: false, type: Boolean })
  async getByChannel(
    @Param('channelId') channelId: string,
    @Query('includeEnded') includeEnded?: string,
  ) {
    const livestreams = await this.livestreamService.getByChannel(
      channelId,
      includeEnded === 'true',
    );

    return {
      success: true,
      data: { livestreams },
    };
  }

  @Get('program/:programId')
  @ApiOperation({ summary: 'Get livestreams by program' })
  @ApiParam({ name: 'programId' })
  @ApiQuery({ name: 'includeEnded', required: false, type: Boolean })
  async getByProgram(
    @Param('programId') programId: string,
    @Query('includeEnded') includeEnded?: string,
  ) {
    const livestreams = await this.livestreamService.getByProgram(
      programId,
      includeEnded === 'true',
    );

    return {
      success: true,
      data: { livestreams },
    };
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get livestream stats (viewer count, like count)' })
  @ApiParam({ name: 'id' })
  async getStats(@Param('id') id: string) {
    const stats = await this.livestreamService.getStats(id);

    return {
      success: true,
      data: stats,
    };
  }

  @Get(':id/like-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user liked a livestream' })
  @ApiParam({ name: 'id' })
  async getLikeStatus(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const status = await this.livestreamService.getLikeStatus(
      user._id.toString(),
      id,
    );

    return {
      success: true,
      data: status,
    };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle like on a livestream' })
  @ApiParam({ name: 'id' })
  async toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.livestreamService.toggleLike(
      user._id.toString(),
      id,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single livestream by ID' })
  @ApiParam({ name: 'id' })
  async getById(@Param('id') id: string) {
    const livestream = await this.livestreamService.getById(id);

    return {
      success: true,
      data: livestream,
    };
  }
}

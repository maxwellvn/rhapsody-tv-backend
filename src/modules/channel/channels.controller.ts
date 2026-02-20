import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import { ChannelsService } from './channels.service';
import {
  ChannelDetailsResponseDto,
  ChannelLivestreamDto,
  ChannelProgramDto,
  ChannelVideosPaginatedDto,
} from './dto';

@ApiTags('Channels')
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Public()
  @Get(':slug')
  @ApiOperation({
    summary: 'Get channel details (header/about + latest videos)',
  })
  @ApiParam({ name: 'slug', description: 'Channel slug' })
  @ApiQuery({ name: 'latestVideosLimit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Channel details retrieved successfully',
    model: ChannelDetailsResponseDto,
  })
  async getChannelDetails(
    @Param('slug') slug: string,
    @Query('latestVideosLimit') latestVideosLimit?: number,
  ) {
    const data = await this.channelsService.getChannelDetailsBySlug(
      slug,
      latestVideosLimit,
    );

    return {
      success: true,
      message: 'Channel details retrieved successfully',
      data,
    };
  }

  @Public()
  @Get(':slug/videos')
  @ApiOperation({ summary: 'Get channel videos (paginated)' })
  @ApiParam({ name: 'slug', description: 'Channel slug' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'programId', required: false, type: String })
  @ApiOkSuccessResponse({
    description: 'Channel videos retrieved successfully',
    model: ChannelVideosPaginatedDto,
  })
  async getChannelVideos(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('programId') programId?: string,
  ) {
    const data = await this.channelsService.getChannelVideosBySlug(
      slug,
      page,
      limit,
      programId,
    );

    return {
      success: true,
      message: 'Channel videos retrieved successfully',
      data,
    };
  }

  @Public()
  @Get(':slug/schedule')
  @ApiOperation({ summary: 'Get channel schedule/programs' })
  @ApiParam({ name: 'slug', description: 'Channel slug' })
  @ApiQuery({ name: 'date', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Channel programs retrieved successfully',
    model: ChannelProgramDto,
    isArray: true,
  })
  async getChannelSchedule(
    @Param('slug') slug: string,
    @Query('date') date?: string,
    @Query('limit') limit?: number,
  ) {
    const data = await this.channelsService.getChannelScheduleBySlug(
      slug,
      date,
      limit,
    );

    return {
      success: true,
      message: 'Channel programs retrieved successfully',
      data,
    };
  }

  @Public()
  @Get(':slug/livestreams')
  @ApiOperation({ summary: 'Get channel livestreams' })
  @ApiParam({ name: 'slug', description: 'Channel slug' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['scheduled', 'live', 'ended', 'canceled'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Channel livestreams retrieved successfully',
    model: ChannelLivestreamDto,
    isArray: true,
  })
  async getChannelLivestreams(
    @Param('slug') slug: string,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    const data = await this.channelsService.getChannelLivestreamsBySlug(
      slug,
      limit,
      status,
    );

    return {
      success: true,
      message: 'Channel livestreams retrieved successfully',
      data,
    };
  }
}

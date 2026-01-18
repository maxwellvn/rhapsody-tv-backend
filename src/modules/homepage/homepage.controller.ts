import { Controller, Get, Query, Body, Post, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public, CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import { HomepageService } from './homepage.service';
import { ContinueWatchingService } from '../stream/services/continue-watching.service';
import {
  GetHomepageQueryDto,
  HomepageChannelDto,
  HomepageProgramDto,
  HomepageVideoDto,
  HomepageContinueWatchingDto,
  UpdateProgressDto,
} from './dto';

@ApiTags('Homepage')
@Controller('homepage')
export class HomepageController {
  constructor(
    private readonly homepageService: HomepageService,
    private readonly continueWatchingService: ContinueWatchingService,
  ) {}

  @Public()
  @Get('live-now')
  @ApiOperation({ summary: 'Get live now program' })
  @ApiOkSuccessResponse({
    description: 'Live now program retrieved successfully',
    model: HomepageProgramDto,
  })
  async getLiveNow() {
    const data = await this.homepageService.getLiveNow();
    return {
      success: true,
      message: 'Live now program retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth()
  @Get('continue-watching')
  @ApiOperation({ summary: 'Get continue watching list' })
  @ApiOkSuccessResponse({
    description: 'Continue watching list retrieved successfully',
    model: HomepageContinueWatchingDto,
    isArray: true,
  })
  async getContinueWatching(@CurrentUser('sub') userId: string): Promise<{
    success: boolean;
    message: string;
    data: HomepageContinueWatchingDto[];
  }> {
    const data = await this.homepageService.getContinueWatching(userId);
    return {
      success: true,
      message: 'Continue watching list retrieved successfully',
      data,
    };
  }

  @Public()
  @Get('channels')
  @ApiOperation({ summary: 'Get channels' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Channels retrieved successfully',
    model: HomepageChannelDto,
    isArray: true,
  })
  async getChannels(@Query() query: GetHomepageQueryDto) {
    const data = await this.homepageService.getChannels(query.limit);
    return {
      success: true,
      message: 'Channels retrieved successfully',
      data,
    };
  }

  @Public()
  @Get('programs')
  @ApiOperation({ summary: 'Get programs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Programs retrieved successfully',
    model: HomepageProgramDto,
    isArray: true,
  })
  async getPrograms(@Query() query: GetHomepageQueryDto) {
    const data = await this.homepageService.getPrograms(query.limit);
    return {
      success: true,
      message: 'Programs retrieved successfully',
      data,
    };
  }

  @Public()
  @Get('featured-videos')
  @ApiOperation({ summary: 'Get featured videos' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Featured videos retrieved successfully',
    model: HomepageVideoDto,
    isArray: true,
  })
  async getFeaturedVideos(@Query() query: GetHomepageQueryDto) {
    const data = await this.homepageService.getFeaturedVideos(query.limit);
    return {
      success: true,
      message: 'Featured videos retrieved successfully',
      data,
    };
  }

  @Public()
  @Get('program-highlights')
  @ApiOperation({ summary: 'Get program highlights' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Program highlights retrieved successfully',
    model: HomepageVideoDto,
    isArray: true,
  })
  async getProgramHighlights(@Query() query: GetHomepageQueryDto) {
    const data = await this.homepageService.getProgramHighlights(query.limit);
    return {
      success: true,
      message: 'Program highlights retrieved successfully',
      data,
    };
  }

  @ApiBearerAuth()
  @Post('update-progress')
  @ApiOperation({ summary: 'Update video watch progress' })
  @ApiOkSuccessResponse({
    description: 'Progress updated successfully',
    model: HomepageContinueWatchingDto,
  })
  async updateProgress(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProgressDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: HomepageContinueWatchingDto;
  }> {
    const record = await this.continueWatchingService.updateProgress(
      userId,
      dto.videoId,
      dto.progressSeconds,
      dto.durationSeconds,
    );

    const video = await this.homepageService.getVideoById(dto.videoId);

    return {
      success: true,
      message: 'Progress updated successfully',
      data: {
        video: video ? this.homepageService.toVideoDto(video) : undefined,
        progressSeconds: record.progressSeconds,
        durationSeconds: record.durationSeconds,
      },
    };
  }

  @Public()
  @Get('watch-livestream/:livestreamId')
  @ApiOperation({ summary: 'Get livestream details for watching' })
  @ApiOkSuccessResponse({
    description: 'Livestream details retrieved successfully',
    model: HomepageProgramDto,
  })
  async watchLivestream(@Param('livestreamId') livestreamId: string): Promise<{
    success: boolean;
    message: string;
    data: HomepageProgramDto | null;
  }> {
    const data = await this.homepageService.getLivestreamById(livestreamId);
    return {
      success: true,
      message: 'Livestream details retrieved successfully',
      data,
    };
  }
}

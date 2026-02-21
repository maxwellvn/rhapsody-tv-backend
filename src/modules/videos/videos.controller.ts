import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiOkSuccessResponse } from '../../common/swagger';
import { SearchVideosQueryDto, PaginatedVideosResponseDto, VideoResponseDto } from './dto';
import { VideosService } from './videos.service';

@ApiTags('Videos')
@ApiBearerAuth()
@Controller('videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @ApiOperation({ summary: 'Get public videos (paginated)' })
  @ApiOkSuccessResponse({
    description: 'Videos retrieved successfully',
    model: PaginatedVideosResponseDto,
  })
  async list(@Query() query: SearchVideosQueryDto) {
    return {
      success: true,
      message: 'Videos retrieved successfully',
      data: await this.videosService.list(query),
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Semantic search for videos' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiOkSuccessResponse({
    description: 'Search results retrieved successfully',
    model: PaginatedVideosResponseDto,
  })
  async search(@Query() query: SearchVideosQueryDto) {
    return {
      success: true,
      message: 'Search results retrieved successfully',
      data: await this.videosService.search(query),
    };
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending videos' })
  @ApiOkSuccessResponse({
    description: 'Trending videos retrieved successfully',
    model: PaginatedVideosResponseDto,
  })
  async trending(@Query() query: SearchVideosQueryDto) {
    return {
      success: true,
      message: 'Trending videos retrieved successfully',
      data: await this.videosService.trending(query),
    };
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get recommended videos' })
  @ApiOkSuccessResponse({
    description: 'Recommended videos retrieved successfully',
    model: PaginatedVideosResponseDto,
  })
  async recommended(@Query() query: SearchVideosQueryDto) {
    return {
      success: true,
      message: 'Recommended videos retrieved successfully',
      data: await this.videosService.recommended(query),
    };
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related videos' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiOkSuccessResponse({
    description: 'Related videos retrieved successfully',
    model: PaginatedVideosResponseDto,
  })
  async related(
    @Param('id') id: string,
    @Query() query: SearchVideosQueryDto,
  ) {
    return {
      success: true,
      message: 'Related videos retrieved successfully',
      data: await this.videosService.related(id, query),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get video details' })
  @ApiParam({ name: 'id', description: 'Video ID' })
  @ApiOkSuccessResponse({
    description: 'Video retrieved successfully',
    model: VideoResponseDto,
  })
  async details(@Param('id') id: string) {
    return {
      success: true,
      message: 'Video retrieved successfully',
      data: await this.videosService.details(id),
    };
  }
}

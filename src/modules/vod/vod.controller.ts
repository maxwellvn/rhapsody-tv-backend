import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { VodService } from './vod.service';
import { CreateCommentDto } from './dto';
import { CurrentUser } from '../../common/decorators';
import type { UserDocument } from '../user/schemas/user.schema';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../common/swagger';
import {
  VodVideoResponseDto,
  VodPaginatedVideosResponseDto,
  VodCommentResponseDto,
  VodPaginatedCommentsResponseDto,
} from './dto';

@ApiTags('VOD (Video on Demand)')
@ApiBearerAuth()
@Controller('vod')
export class VodController {
  constructor(private readonly vodService: VodService) {}

  @Get()
  @ApiOperation({ summary: 'Get all public videos (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkSuccessResponse({
    description: 'Videos retrieved successfully',
    model: VodPaginatedVideosResponseDto,
  })
  async getVideos(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.vodService.getVideos(page, limit);
    return {
      success: true,
      message: 'Videos retrieved successfully',
      data: result,
    };
  }

  @Get(':videoId')
  @ApiOperation({ summary: 'Get video details and increment view count' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiOkSuccessResponse({
    description: 'Video retrieved successfully',
    model: VodVideoResponseDto,
  })
  async getVideoById(@Param('videoId') videoId: string) {
    const video = await this.vodService.getVideoById(videoId);
    return {
      success: true,
      message: 'Video retrieved successfully',
      data: video,
    };
  }

  @Post(':videoId/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on a video (like/unlike)' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiOkSuccessResponse({ description: 'Like toggled successfully' })
  async toggleLike(
    @CurrentUser() user: UserDocument,
    @Param('videoId') videoId: string,
  ) {
    const result = await this.vodService.toggleLike(
      user._id.toString(),
      videoId,
    );
    return {
      success: true,
      message: result.message,
      data: { liked: result.liked },
    };
  }

  @Get(':videoId/like-status')
  @ApiOperation({ summary: 'Check if current user has liked the video' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiOkSuccessResponse({ description: 'Like status retrieved successfully' })
  async getLikeStatus(
    @CurrentUser() user: UserDocument,
    @Param('videoId') videoId: string,
  ) {
    const result = await this.vodService.getLikeStatus(
      user._id.toString(),
      videoId,
    );
    return {
      success: true,
      message: 'Like status retrieved successfully',
      data: result,
    };
  }

  @Get(':videoId/comments')
  @ApiOperation({ summary: 'Get comments for a video (with nested replies)' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkSuccessResponse({
    description: 'Comments retrieved successfully',
    model: VodPaginatedCommentsResponseDto,
  })
  async getComments(
    @Param('videoId') videoId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.vodService.getComments(videoId, page, limit);
    return {
      success: true,
      message: 'Comments retrieved successfully',
      data: result,
    };
  }

  @Post(':videoId/comments')
  @ApiOperation({ summary: 'Add a comment to a video' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiCreatedSuccessResponse({
    description: 'Comment added successfully',
    model: VodCommentResponseDto,
  })
  async addComment(
    @CurrentUser() user: UserDocument,
    @Param('videoId') videoId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const comment = await this.vodService.addComment(
      user._id.toString(),
      videoId,
      dto,
    );
    return {
      success: true,
      message: 'Comment added successfully',
      data: comment,
    };
  }

  @Post(':videoId/comments/:commentId/reply')
  @ApiOperation({ summary: 'Reply to a comment (one level nesting only)' })
  @ApiParam({ name: 'videoId', description: 'Video ID' })
  @ApiParam({ name: 'commentId', description: 'Parent comment ID' })
  @ApiCreatedSuccessResponse({
    description: 'Reply added successfully',
    model: VodCommentResponseDto,
  })
  async replyToComment(
    @CurrentUser() user: UserDocument,
    @Param('videoId') videoId: string,
    @Param('commentId') commentId: string,
    @Body() dto: CreateCommentDto,
  ) {
    const reply = await this.vodService.replyToComment(
      user._id.toString(),
      videoId,
      commentId,
      dto,
    );
    return {
      success: true,
      message: 'Reply added successfully',
      data: reply,
    };
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own comment (soft delete)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiOkSuccessResponse({ description: 'Comment deleted successfully' })
  async deleteComment(
    @CurrentUser() user: UserDocument,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.vodService.deleteComment(
      user._id.toString(),
      commentId,
    );
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like on a comment (like/unlike)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiOkSuccessResponse({ description: 'Comment like toggled successfully' })
  async toggleCommentLike(
    @CurrentUser() user: UserDocument,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.vodService.toggleCommentLike(
      user._id.toString(),
      commentId,
    );
    return {
      success: true,
      message: result.message,
      data: { liked: result.liked },
    };
  }

  @Get('comments/:commentId/like-status')
  @ApiOperation({ summary: 'Check if current user has liked the comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiOkSuccessResponse({ description: 'Like status retrieved successfully' })
  async getCommentLikeStatus(
    @CurrentUser() user: UserDocument,
    @Param('commentId') commentId: string,
  ) {
    const result = await this.vodService.getCommentLikeStatus(
      user._id.toString(),
      commentId,
    );
    return {
      success: true,
      message: 'Like status retrieved successfully',
      data: result,
    };
  }
}

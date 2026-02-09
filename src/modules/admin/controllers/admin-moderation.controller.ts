import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiOkSuccessResponse,
} from '../../../common/swagger';
import { AdminModerationService } from '../services/admin-moderation.service';
import {
  AdminLivestreamCommentResponseDto,
  AdminPaginatedLivestreamCommentsResponseDto,
  AdminPaginatedVodCommentsResponseDto,
  AdminVodCommentResponseDto,
  SetCommentDeletedDto,
} from '../dto/moderation';

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

@ApiTags('Admin Moderation')
@ApiBearerAuth()
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly adminModerationService: AdminModerationService) {}

  @Get('vod-comments')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List VOD comments (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'videoId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  @ApiOkSuccessResponse({
    description: 'Comments retrieved successfully',
    model: AdminPaginatedVodCommentsResponseDto,
  })
  async listVodComments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('videoId') videoId?: string,
    @Query('userId') userId?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    const result = await this.adminModerationService.listVodComments({
      page,
      limit,
      videoId,
      userId,
      isDeleted: parseOptionalBoolean(isDeleted),
    });

    return {
      success: true,
      message: 'Comments retrieved successfully',
      data: result,
    };
  }

  @Patch('vod-comments/:commentId/deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Soft delete/restore a VOD comment (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'Comment updated successfully',
    model: AdminVodCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async setVodCommentDeleted(
    @Param('commentId') commentId: string,
    @Body() dto: SetCommentDeletedDto,
  ) {
    const data = await this.adminModerationService.setVodCommentDeleted(
      commentId,
      dto.isDeleted,
    );
    return {
      success: true,
      message: 'Comment updated successfully',
      data,
    };
  }

  @Get('livestream-comments')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List livestream comments (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'livestreamId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'isDeleted', required: false, type: Boolean })
  @ApiOkSuccessResponse({
    description: 'Comments retrieved successfully',
    model: AdminPaginatedLivestreamCommentsResponseDto,
  })
  async listLivestreamComments(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('livestreamId') livestreamId?: string,
    @Query('userId') userId?: string,
    @Query('isDeleted') isDeleted?: string,
  ) {
    const result = await this.adminModerationService.listLivestreamComments({
      page,
      limit,
      livestreamId,
      userId,
      isDeleted: parseOptionalBoolean(isDeleted),
    });

    return {
      success: true,
      message: 'Comments retrieved successfully',
      data: result,
    };
  }

  @Patch('livestream-comments/:commentId/deleted')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Soft delete/restore a livestream comment (Admin only)',
  })
  @ApiOkSuccessResponse({
    description: 'Comment updated successfully',
    model: AdminLivestreamCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async setLivestreamCommentDeleted(
    @Param('commentId') commentId: string,
    @Body() dto: SetCommentDeletedDto,
  ) {
    const data = await this.adminModerationService.setLivestreamCommentDeleted(
      commentId,
      dto.isDeleted,
    );
    return {
      success: true,
      message: 'Comment updated successfully',
      data,
    };
  }
}

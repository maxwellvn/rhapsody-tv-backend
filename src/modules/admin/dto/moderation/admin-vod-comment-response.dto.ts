import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminCommentUserDto } from './admin-comment-user.dto';

export class AdminVodCommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Video ID' })
  videoId: string;

  @ApiProperty({ description: 'Comment message' })
  message: string;

  @ApiProperty({ description: 'User who made the comment' })
  user: AdminCommentUserDto;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  parentCommentId?: string;

  @ApiProperty({ description: 'Whether the comment is deleted (soft delete)' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Number of likes on comment' })
  likeCount: number;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}

export class AdminPaginatedVodCommentsResponseDto {
  @ApiProperty({ type: [AdminVodCommentResponseDto] })
  comments: AdminVodCommentResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

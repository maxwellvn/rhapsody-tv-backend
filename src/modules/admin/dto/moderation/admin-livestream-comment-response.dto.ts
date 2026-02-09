import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminCommentUserDto } from './admin-comment-user.dto';

export class AdminLivestreamCommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Livestream ID' })
  liveStreamId: string;

  @ApiProperty({ description: 'Comment message' })
  message: string;

  @ApiProperty({ description: 'User who made the comment' })
  user: AdminCommentUserDto;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  parentCommentId?: string;

  @ApiProperty({ description: 'Whether the comment is deleted (soft delete)' })
  isDeleted: boolean;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated date' })
  updatedAt: Date;
}

export class AdminPaginatedLivestreamCommentsResponseDto {
  @ApiProperty({ type: [AdminLivestreamCommentResponseDto] })
  comments: AdminLivestreamCommentResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

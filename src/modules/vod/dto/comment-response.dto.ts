import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CommentUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User full name' })
  fullName: string;
}

export class VodCommentResponseDto {
  @ApiProperty({ description: 'Comment ID' })
  id: string;

  @ApiProperty({ description: 'Video ID' })
  videoId: string;

  @ApiProperty({ description: 'Comment message' })
  message: string;

  @ApiProperty({ description: 'User who made the comment' })
  user: CommentUserDto;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  parentCommentId?: string;

  @ApiProperty({ description: 'Number of likes on comment' })
  likeCount: number;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Nested replies (only for top-level comments)',
    type: [VodCommentResponseDto],
  })
  replies?: VodCommentResponseDto[];
}

export class VodPaginatedCommentsResponseDto {
  @ApiProperty({ type: [VodCommentResponseDto] })
  comments: VodCommentResponseDto[];

  @ApiProperty({ description: 'Total number of comments' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

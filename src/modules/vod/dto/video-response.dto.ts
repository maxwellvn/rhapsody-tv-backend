import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VodVideoResponseDto {
  @ApiProperty({ description: 'Video ID' })
  id: string;

  @ApiProperty({ description: 'Channel ID' })
  channelId: string;

  @ApiProperty({ description: 'Video title' })
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  description?: string;

  @ApiProperty({ description: 'Playback URL' })
  playbackUrl: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  durationSeconds?: number;

  @ApiProperty({ description: 'View count' })
  viewCount: number;

  @ApiProperty({ description: 'Like count' })
  likeCount: number;

  @ApiProperty({ description: 'Comment count' })
  commentCount: number;

  @ApiPropertyOptional({ description: 'Published date' })
  publishedAt?: Date;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiPropertyOptional({ description: 'Channel information' })
  channel?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
}

export class VodPaginatedVideosResponseDto {
  @ApiProperty({ type: [VodVideoResponseDto] })
  videos: VodVideoResponseDto[];

  @ApiProperty({ description: 'Total number of videos' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

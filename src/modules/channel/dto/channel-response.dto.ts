import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelDetailsDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Rhapsody TV' })
  name: string;

  @ApiProperty({ example: 'rhapsody-tv' })
  slug: string;

  @ApiPropertyOptional({ example: 'Channel description' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com' })
  websiteUrl?: string;

  @ApiProperty({ example: 0 })
  subscriberCount: number;

  @ApiProperty({ example: 0 })
  videoCount: number;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  joinedAt: string;
}

export class ChannelVideoListItemDto {
  @ApiProperty({ description: 'Video ID' })
  id: string;

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

  @ApiPropertyOptional({ description: 'Published date' })
  publishedAt?: string;
}

export class ChannelProgramDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Morning Show' })
  title: string;

  @ApiPropertyOptional({ example: 'Start your day with us' })
  description?: string;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  startTime: string;

  @ApiProperty({ example: '2026-01-15T09:00:00.000Z' })
  endTime: string;

  @ApiPropertyOptional({ example: 60 })
  durationInMinutes?: number;

  @ApiPropertyOptional({ example: 'News' })
  category?: string;

  @ApiProperty({ example: false })
  isLive: boolean;

  @ApiProperty({ example: 0 })
  viewerCount: number;

  @ApiProperty({ example: 0 })
  bookmarkCount: number;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  videoId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  liveStreamId?: string;
}

export class ChannelVideosPaginatedDto {
  @ApiProperty({ type: [ChannelVideoListItemDto] })
  videos: ChannelVideoListItemDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class ChannelDetailsResponseDto {
  @ApiProperty({ type: ChannelDetailsDto })
  channel: ChannelDetailsDto;

  @ApiProperty({ type: [ChannelVideoListItemDto] })
  latestVideos: ChannelVideoListItemDto[];
}

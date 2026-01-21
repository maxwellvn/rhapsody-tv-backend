import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Base response DTOs
export class ChannelResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Music Channel' })
  name: string;

  @ApiProperty({ example: 'music-channel' })
  slug: string;

  @ApiPropertyOptional({ example: 'Your favorite music channel' })
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

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  updatedAt: string;
}

export class LivestreamResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  channelId: string;

  @ApiPropertyOptional({ example: 'Live Concert' })
  title?: string;

  @ApiPropertyOptional({ example: 'Watch our live concert' })
  description?: string;

  @ApiProperty({
    enum: ['scheduled', 'live', 'ended', 'canceled'],
    example: 'scheduled',
  })
  status: string;

  @ApiPropertyOptional({ example: '2026-01-15T20:00:00.000Z' })
  scheduledStartAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15T20:00:00.000Z' })
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15T21:30:00.000Z' })
  endedAt?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'rtmp://...' })
  playbackUrl?: string;

  @ApiPropertyOptional({ example: 'rtmp://...' })
  rtmpUrl?: string;

  @ApiPropertyOptional({ example: 'stream123' })
  streamKey?: string;

  @ApiProperty({ example: true })
  isChatEnabled: boolean;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  updatedAt: string;
}

export class VideoResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  channelId: string;

  @ApiProperty({ example: 'My Video Title' })
  title: string;

  @ApiPropertyOptional({ example: 'Video description' })
  description?: string;

  @ApiProperty({ example: 'https://example.com/video.mp4' })
  playbackUrl: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 3600 })
  durationSeconds?: number;

  @ApiProperty({ enum: ['public', 'unlisted', 'private'], example: 'public' })
  visibility: string;

  @ApiProperty({ example: 0 })
  viewCount: number;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ example: '2026-01-15T20:00:00.000Z' })
  publishedAt?: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  updatedAt: string;
}

export class ProgramResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  channelId: string;

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

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  updatedAt: string;
}

export class UploadResponseDto {
  @ApiProperty({ example: 'file123' })
  fileId: string;

  @ApiProperty({ example: 'image.jpg' })
  name: string;

  @ApiProperty({ example: 'https://ik.imagekit.io/...' })
  url: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  thumbnailUrl?: string;

  @ApiProperty({ example: 1920 })
  width: number;

  @ApiProperty({ example: 1080 })
  height: number;

  @ApiProperty({ example: 2048576 })
  size: number;

  @ApiProperty({ example: 'image/jpeg' })
  contentType: string;
}

// Paginated response DTOs
export class PaginatedChannelsResponseDto {
  @ApiProperty({ type: [ChannelResponseDto] })
  channels: ChannelResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

export class PaginatedLivestreamsResponseDto {
  @ApiProperty({ type: [LivestreamResponseDto] })
  livestreams: LivestreamResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

export class PaginatedVideosResponseDto {
  @ApiProperty({ type: [VideoResponseDto] })
  videos: VideoResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

export class PaginatedProgramsResponseDto {
  @ApiProperty({ type: [ProgramResponseDto] })
  programs: ProgramResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  pages: number;
}

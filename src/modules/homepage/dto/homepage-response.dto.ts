import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomepageChannelDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Rhapsody TV' })
  name: string;

  @ApiProperty({ example: 'rhapsody-tv' })
  slug: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  defaultLiveStreamId?: string;
}

export class HomepageProgramDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Morning Show' })
  title: string;

  @ApiPropertyOptional({ example: 'Start your day with us' })
  description?: string;

  @ApiPropertyOptional({
    enum: ['daily', 'weekly', 'once', 'continuous', 'scheduled'],
    example: 'daily',
  })
  scheduleType?: string;

  @ApiPropertyOptional({ example: '08:00' })
  startTimeOfDay?: string;

  @ApiPropertyOptional({ example: '09:00' })
  endTimeOfDay?: string;

  @ApiPropertyOptional({ type: [Number], example: [1, 3, 5] })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: 'UTC' })
  timezone?: string;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  startTime: string;

  @ApiProperty({ example: '2026-01-15T09:00:00.000Z' })
  endTime: string;

  @ApiProperty({ example: false })
  isLive: boolean;

  @ApiPropertyOptional({
    enum: ['scheduled', 'live', 'ended', 'canceled'],
    example: 'live',
  })
  status?: string;

  @ApiPropertyOptional({ type: HomepageChannelDto })
  channel?: HomepageChannelDto;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  videoId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  liveStreamId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/live/stream.m3u8' })
  playbackUrl?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: true })
  isChatEnabled?: boolean;

  @ApiPropertyOptional({ example: 'rtmp://example.com/live/key' })
  rtmpUrl?: string;

  @ApiPropertyOptional({ example: false })
  isDefaultForChannel?: boolean;
}

export class HomepageLivestreamDto extends HomepageProgramDto {}

export class HomepageVideoDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

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

  @ApiPropertyOptional({ example: false })
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: 1 })
  featuredOrder?: number;

  @ApiPropertyOptional({ type: HomepageChannelDto })
  channel?: HomepageChannelDto;
}

export class HomepageContinueWatchingDto {
  @ApiPropertyOptional({ type: HomepageVideoDto })
  video?: HomepageVideoDto;

  @ApiProperty({ example: 120 })
  progressSeconds: number;

  @ApiProperty({ example: 3600 })
  durationSeconds: number;
}

export class SearchChannelResultDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Rhapsody TV' })
  name: string;

  @ApiProperty({ example: 'rhapsody-tv' })
  slug: string;

  @ApiPropertyOptional({ example: 'A channel description' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  defaultLiveStreamId?: string;

  @ApiProperty({ example: 1200 })
  subscriberCount: number;
}

export class SearchProgramResultDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Morning Devotion' })
  title: string;

  @ApiPropertyOptional({ example: 'Daily morning inspiration' })
  description?: string;

  @ApiPropertyOptional({ example: 'daily' })
  scheduleType?: string;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  startTime: string;

  @ApiProperty({ example: '2026-01-15T09:00:00.000Z' })
  endTime: string;

  @ApiProperty({ example: false })
  isLive: boolean;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ type: HomepageChannelDto })
  channel?: HomepageChannelDto;
}

export class UnifiedSearchTotalsDto {
  @ApiProperty({ example: 12 })
  videos: number;

  @ApiProperty({ example: 3 })
  channels: number;

  @ApiProperty({ example: 7 })
  programs: number;
}

export class UnifiedSearchResultsDto {
  @ApiProperty({ type: [HomepageVideoDto] })
  videos: HomepageVideoDto[];

  @ApiProperty({ type: [SearchChannelResultDto] })
  channels: SearchChannelResultDto[];

  @ApiProperty({ type: [SearchProgramResultDto] })
  programs: SearchProgramResultDto[];

  @ApiProperty({ type: UnifiedSearchTotalsDto })
  totals: UnifiedSearchTotalsDto;
}

export class HomepageResponseDto {
  @ApiPropertyOptional({ type: HomepageProgramDto })
  liveNow?: HomepageProgramDto;

  @ApiProperty({ type: [HomepageContinueWatchingDto] })
  continueWatching: HomepageContinueWatchingDto[];

  @ApiProperty({ type: [HomepageChannelDto] })
  channels: HomepageChannelDto[];

  @ApiProperty({ type: [HomepageProgramDto] })
  programs: HomepageProgramDto[];

  @ApiProperty({ type: [HomepageVideoDto] })
  featuredVideos: HomepageVideoDto[];

  @ApiProperty({ type: [HomepageVideoDto] })
  programHighlights: HomepageVideoDto[];
}

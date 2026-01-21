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
}

export class HomepageProgramDto {
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

  @ApiProperty({ example: false })
  isLive: boolean;

  @ApiPropertyOptional({ type: HomepageChannelDto })
  channel?: HomepageChannelDto;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  videoId?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  liveStreamId?: string;

  // Schedule fields
  @ApiPropertyOptional({ example: 'daily', enum: ['daily', 'weekly', 'once'] })
  scheduleType?: string;

  @ApiPropertyOptional({ example: '09:00' })
  startTimeOfDay?: string;

  @ApiPropertyOptional({ example: '10:00' })
  endTimeOfDay?: string;

  @ApiPropertyOptional({ example: [1, 3, 5], type: [Number] })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: 60 })
  durationInMinutes?: number;

  @ApiPropertyOptional({ example: 'America/New_York' })
  timezone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/stream.m3u8' })
  playbackUrl?: string;

  @ApiPropertyOptional({ example: 1234 })
  viewerCount?: number;

  @ApiPropertyOptional({ example: '2026-01-15T08:00:00.000Z' })
  startedAt?: string;
}

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

export class HomepageLivestreamDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Live Concert' })
  title: string;

  @ApiPropertyOptional({ example: 'Watch our live concert' })
  description?: string;

  @ApiProperty({ example: 'continuous', enum: ['continuous', 'scheduled'] })
  scheduleType: string;

  @ApiProperty({ example: 'live', enum: ['scheduled', 'live', 'ended', 'canceled'] })
  status: string;

  @ApiPropertyOptional({ example: '2026-01-15T20:00:00.000Z' })
  scheduledStartAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15T22:00:00.000Z' })
  scheduledEndAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15T20:05:00.000Z' })
  startedAt?: string;

  @ApiPropertyOptional({ example: 'https://example.com/thumbnail.jpg' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/live/stream.m3u8' })
  playbackUrl?: string;

  @ApiPropertyOptional({ type: HomepageChannelDto })
  channel?: HomepageChannelDto;

  @ApiPropertyOptional({ type: HomepageProgramDto })
  program?: HomepageProgramDto;
}

export class HomepageResponseDto {
  @ApiPropertyOptional({ type: HomepageProgramDto })
  liveNow?: HomepageProgramDto;

  @ApiProperty({ type: [HomepageLivestreamDto] })
  livestreams: HomepageLivestreamDto[];

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

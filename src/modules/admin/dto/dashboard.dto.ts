import { ApiProperty } from '@nestjs/swagger';

export class AdminDashboardUserStatsDto {
  @ApiProperty({ example: 1200 })
  total: number;

  @ApiProperty({ example: 1100 })
  active: number;

  @ApiProperty({ example: 900 })
  verified: number;

  @ApiProperty({ example: 5 })
  admins: number;

  @ApiProperty({ example: 20 })
  newLast7Days: number;

  @ApiProperty({ example: 60 })
  newLast30Days: number;
}

export class AdminDashboardChannelStatsDto {
  @ApiProperty({ example: 50 })
  total: number;

  @ApiProperty({ example: 47 })
  active: number;

  @ApiProperty({ example: 4 })
  newLast7Days: number;

  @ApiProperty({ example: 12 })
  newLast30Days: number;
}

export class AdminDashboardVideoStatsDto {
  @ApiProperty({ example: 500 })
  total: number;

  @ApiProperty({ example: 470 })
  active: number;

  @ApiProperty({ example: 420 })
  public: number;

  @ApiProperty({ example: 30 })
  unlisted: number;

  @ApiProperty({ example: 50 })
  private: number;

  @ApiProperty({ example: 25 })
  newLast7Days: number;

  @ApiProperty({ example: 80 })
  newLast30Days: number;
}

export class AdminDashboardLivestreamStatsDto {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 3 })
  live: number;

  @ApiProperty({ example: 20 })
  scheduled: number;

  @ApiProperty({ example: 90 })
  ended: number;

  @ApiProperty({ example: 7 })
  canceled: number;

  @ApiProperty({ example: 5 })
  newLast7Days: number;

  @ApiProperty({ example: 18 })
  newLast30Days: number;
}

export class AdminDashboardProgramStatsDto {
  @ApiProperty({ example: 240 })
  total: number;

  @ApiProperty({ example: 200 })
  active: number;

  @ApiProperty({ example: 14 })
  upcoming: number;

  @ApiProperty({ example: 12 })
  newLast7Days: number;

  @ApiProperty({ example: 40 })
  newLast30Days: number;
}

export class AdminDashboardOverviewResponseDto {
  @ApiProperty({ type: AdminDashboardUserStatsDto })
  users: AdminDashboardUserStatsDto;

  @ApiProperty({ type: AdminDashboardChannelStatsDto })
  channels: AdminDashboardChannelStatsDto;

  @ApiProperty({ type: AdminDashboardVideoStatsDto })
  videos: AdminDashboardVideoStatsDto;

  @ApiProperty({ type: AdminDashboardLivestreamStatsDto })
  livestreams: AdminDashboardLivestreamStatsDto;

  @ApiProperty({ type: AdminDashboardProgramStatsDto })
  programs: AdminDashboardProgramStatsDto;
}

export class AdminDashboardVideoEngagementDto {
  @ApiProperty({ example: 250000 })
  totalViews: number;

  @ApiProperty({ example: 18000 })
  totalLikes: number;

  @ApiProperty({ example: 6200 })
  totalComments: number;

  @ApiProperty({ example: 4200 })
  totalCommentLikes: number;
}

export class AdminDashboardLivestreamEngagementDto {
  @ApiProperty({ example: 3500 })
  totalLikes: number;

  @ApiProperty({ example: 720 })
  totalComments: number;

  @ApiProperty({ example: 15 })
  totalBans: number;
}

export class AdminDashboardAudienceStatsDto {
  @ApiProperty({ example: 1400 })
  watchlistItems: number;

  @ApiProperty({ example: 900 })
  continueWatchingItems: number;

  @ApiProperty({ example: 650 })
  channelSubscriptions: number;
}

export class AdminDashboardTopVideoChannelDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Music Channel' })
  name: string;

  @ApiProperty({ example: 'music-channel' })
  slug: string;
}

export class AdminDashboardTopVideoDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Top Hits Compilation' })
  title: string;

  @ApiProperty({ example: 120000 })
  viewCount: number;

  @ApiProperty({ example: 5400 })
  likeCount: number;

  @ApiProperty({ example: 320 })
  commentCount: number;

  @ApiProperty({ type: AdminDashboardTopVideoChannelDto, required: false })
  channel?: AdminDashboardTopVideoChannelDto;
}

export class AdminDashboardTopChannelDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'Music Channel' })
  name: string;

  @ApiProperty({ example: 'music-channel' })
  slug: string;

  @ApiProperty({ example: 40000 })
  subscriberCount: number;

  @ApiProperty({ example: 320 })
  videoCount: number;
}

export class AdminDashboardEngagementResponseDto {
  @ApiProperty({ type: AdminDashboardVideoEngagementDto })
  videos: AdminDashboardVideoEngagementDto;

  @ApiProperty({ type: AdminDashboardLivestreamEngagementDto })
  livestreams: AdminDashboardLivestreamEngagementDto;

  @ApiProperty({ type: AdminDashboardAudienceStatsDto })
  audience: AdminDashboardAudienceStatsDto;

  @ApiProperty({ type: [AdminDashboardTopVideoDto] })
  topVideos: AdminDashboardTopVideoDto[];

  @ApiProperty({ type: [AdminDashboardTopChannelDto] })
  topChannels: AdminDashboardTopChannelDto[];
}

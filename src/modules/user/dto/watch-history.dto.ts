import { ApiProperty } from '@nestjs/swagger';
import type { HomepageVideoDto } from '../../homepage/dto';

export class WatchHistoryItemDto {
  @ApiProperty({ type: () => Object })
  video: HomepageVideoDto;

  @ApiProperty({ example: 120 })
  progressSeconds: number;

  @ApiProperty({ example: 3600 })
  durationSeconds: number;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  watchedAt: string;
}

export class PaginatedWatchHistoryResponseDto {
  @ApiProperty({ type: [WatchHistoryItemDto] })
  items: WatchHistoryItemDto[];

  @ApiProperty({ description: 'Total number of watch history items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

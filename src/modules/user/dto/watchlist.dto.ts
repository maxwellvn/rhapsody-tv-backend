import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import type { HomepageVideoDto } from '../../homepage/dto';

export class AddToWatchlistDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Video ID',
  })
  @IsString()
  @IsNotEmpty()
  videoId: string;
}

export class WatchlistItemDto {
  @ApiProperty({ type: () => Object })
  video: HomepageVideoDto;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  addedAt: string;
}

export class PaginatedWatchlistResponseDto {
  @ApiProperty({ type: [WatchlistItemDto] })
  items: WatchlistItemDto[];

  @ApiProperty({ description: 'Total number of watchlist items' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
}

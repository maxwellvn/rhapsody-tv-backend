import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsMongoId,
  MinLength,
  MaxLength,
  IsUrl,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CreateLivestreamScheduleType {
  CONTINUOUS = 'continuous',
  SCHEDULED = 'scheduled',
}

export class CreateLivestreamDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Channel ID',
  })
  @IsMongoId()
  channelId: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Program ID (optional)',
  })
  @IsOptional()
  @IsMongoId()
  programId?: string;

  @ApiProperty({ example: 'Live Concert', description: 'Livestream title' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Watch our live concert' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    example: 'continuous',
    enum: CreateLivestreamScheduleType,
    description: 'Schedule type: continuous (24/7) or scheduled (specific times)',
    default: 'continuous',
  })
  @IsOptional()
  @IsEnum(CreateLivestreamScheduleType)
  scheduleType?: CreateLivestreamScheduleType;

  @ApiPropertyOptional({ 
    example: '2026-01-15T20:00:00.000Z',
    description: 'Scheduled start time (only for scheduled type)',
  })
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional({ 
    example: '2026-01-15T22:00:00.000Z',
    description: 'Scheduled end time (only for scheduled type)',
  })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ 
    example: 'https://example.com/live/stream.m3u8',
    description: 'HLS playback URL (m3u8 format)',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  playbackUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isChatEnabled?: boolean;
}

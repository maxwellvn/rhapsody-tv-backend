import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsMongoId,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LiveStreamScheduleType } from '../../../stream/schemas/live-stream.schema';

export class CreateLivestreamDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Channel ID',
  })
  @IsMongoId()
  channelId: string;

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
    example: '507f1f77bcf86cd799439011',
    description: 'Optional linked Program ID',
  })
  @IsOptional()
  @IsMongoId()
  programId?: string;

  @ApiPropertyOptional({
    enum: LiveStreamScheduleType,
    example: LiveStreamScheduleType.CONTINUOUS,
  })
  @IsOptional()
  @IsEnum(LiveStreamScheduleType)
  scheduleType?: LiveStreamScheduleType;

  @ApiPropertyOptional({ example: '2026-01-15T20:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional({ example: '2026-01-15T22:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledEndAt?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/live/stream.m3u8' })
  @IsOptional()
  @IsString()
  playbackUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isChatEnabled?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'When true, this livestream becomes the channel default livestream used outside scheduled programs',
  })
  @IsOptional()
  @IsBoolean()
  setAsChannelDefault?: boolean;
}

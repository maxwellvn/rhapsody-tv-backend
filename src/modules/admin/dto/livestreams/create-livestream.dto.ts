import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsMongoId,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ example: '2026-01-15T20:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduledStartAt?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isChatEnabled?: boolean;
}

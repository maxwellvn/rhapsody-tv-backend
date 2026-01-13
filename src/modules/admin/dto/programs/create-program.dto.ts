import {
  IsString,
  IsOptional,
  IsDateString,
  IsMongoId,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProgramDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Channel ID',
  })
  @IsMongoId()
  channelId: string;

  @ApiProperty({ example: 'Morning Show', description: 'Program title' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Start your day with us' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: '2026-01-15T08:00:00.000Z',
    description: 'Start time',
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-01-15T09:00:00.000Z', description: 'End time' })
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ example: 'News' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;
}

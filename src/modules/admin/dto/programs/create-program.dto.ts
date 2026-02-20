import {
  IsString,
  IsOptional,
  IsDateString,
  IsMongoId,
  MaxLength,
  IsEnum,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProgramScheduleType } from '../../../channel/schemas/program.schema';

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
    enum: ProgramScheduleType,
    example: ProgramScheduleType.DAILY,
    description: 'Schedule type',
  })
  @IsEnum(ProgramScheduleType)
  scheduleType: ProgramScheduleType;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Time of day in HH:mm for daily/weekly schedules',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTimeOfDay?: string;

  @ApiPropertyOptional({
    example: '09:00',
    description: 'Time of day in HH:mm for daily/weekly schedules',
  })
  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTimeOfDay?: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 3, 5],
    description: 'Days for weekly schedules (0=Sunday ... 6=Saturday)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiProperty({
    example: '2026-01-15T08:00:00.000Z',
    description:
      'Start time. Required for once schedules; optional effective start for daily/weekly',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiProperty({
    example: '2026-01-15T09:00:00.000Z',
    description:
      'End time. Required for once schedules; optional effective end for daily/weekly',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    example: 'UTC',
    description: 'Timezone for recurring schedules',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: 'News' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

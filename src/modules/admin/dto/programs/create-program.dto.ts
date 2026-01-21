import {
  IsString,
  IsOptional,
  IsDateString,
  IsMongoId,
  MaxLength,
  IsEnum,
  IsArray,
  IsInt,
  Min,
  Max,
  Matches,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleType } from '../../../channel/schemas/program.schema';

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
    enum: ScheduleType,
    example: ScheduleType.DAILY,
    description: 'Schedule type: daily, weekly, or once (for special programs)',
  })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

  @ApiPropertyOptional({
    example: '08:00',
    description: 'Start time of day in HH:mm format (for daily/weekly schedules)',
  })
  @ValidateIf((o) => o.scheduleType === ScheduleType.DAILY || o.scheduleType === ScheduleType.WEEKLY)
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTimeOfDay must be in HH:mm format (e.g., 08:00)',
  })
  startTimeOfDay?: string;

  @ApiPropertyOptional({
    example: '09:30',
    description: 'End time of day in HH:mm format (for daily/weekly schedules)',
  })
  @ValidateIf((o) => o.scheduleType === ScheduleType.DAILY || o.scheduleType === ScheduleType.WEEKLY)
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'endTimeOfDay must be in HH:mm format (e.g., 09:30)',
  })
  endTimeOfDay?: string;

  @ApiPropertyOptional({
    example: [1, 2, 3, 4, 5],
    description: 'Days of week for weekly schedule (0=Sunday, 6=Saturday)',
  })
  @ValidateIf((o) => o.scheduleType === ScheduleType.WEEKLY)
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({
    example: '2026-01-15T08:00:00.000Z',
    description: 'For once: specific start datetime. For daily/weekly: schedule effective from date',
  })
  @ValidateIf((o) => o.scheduleType === ScheduleType.ONCE)
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    example: '2026-01-15T09:00:00.000Z',
    description: 'For once: specific end datetime. For daily/weekly: schedule effective until date',
  })
  @ValidateIf((o) => o.scheduleType === ScheduleType.ONCE)
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    example: 'America/New_York',
    description: 'Timezone for the schedule (defaults to UTC)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ example: 'News' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/thumbnail.jpg',
    description: 'Thumbnail image URL',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnailUrl?: string;
}

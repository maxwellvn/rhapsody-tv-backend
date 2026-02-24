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
import {
  ScheduleTargetType,
  ScheduleType,
} from '../../../channel/schemas/schedule.schema';

export class CreateScheduleDto {
  @ApiProperty({
    enum: ScheduleTargetType,
    example: ScheduleTargetType.PROGRAM,
    description: 'Target type: channel or program',
  })
  @IsEnum(ScheduleTargetType)
  targetType: ScheduleTargetType;

  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Target ID (Channel or Program)',
  })
  @IsMongoId()
  targetId: string;

  @ApiProperty({
    enum: ScheduleType,
    example: ScheduleType.DAILY,
    description: 'Schedule type',
  })
  @IsEnum(ScheduleType)
  scheduleType: ScheduleType;

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

  @ApiPropertyOptional({
    example: '2026-01-15T08:00:00.000Z',
    description:
      'Start time. Required for once schedules; optional effective start for daily/weekly',
  })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional({
    example: '2026-01-15T09:00:00.000Z',
    description:
      'End time. Required for once schedules; optional effective end for daily/weekly',
  })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({
    example: 'Africa/Lagos',
    description: 'Timezone for recurring schedules',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: 'Morning Broadcast', description: 'Optional title override' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Daily morning broadcast', description: 'Optional description override' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

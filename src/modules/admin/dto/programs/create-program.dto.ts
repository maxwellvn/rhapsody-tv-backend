import {
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnouncementType } from '../../../channel/schemas/program.schema';

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
    enum: AnnouncementType,
    example: AnnouncementType.PROGRAM,
    description: 'Announcement type for notifications',
  })
  @IsEnum(AnnouncementType)
  announcementType: AnnouncementType;

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

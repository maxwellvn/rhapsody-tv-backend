import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'New feature update' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'We just shipped a new watch experience.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
    description: 'Optional target users. If omitted, sends to all active users.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5000)
  @IsMongoId({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/announcement.jpg' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/channel-logo.png' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: '6995d7e889fbd0b19040153a' })
  @IsOptional()
  @IsMongoId()
  channelId?: string;

  @ApiPropertyOptional({ example: 'rhapsody-tv' })
  @IsOptional()
  @IsString()
  channelSlug?: string;

  @ApiPropertyOptional({ example: '6996068780318cbec24cc600' })
  @IsOptional()
  @IsMongoId()
  programId?: string;

  @ApiPropertyOptional({ example: '6995e67c9657096943bf5205' })
  @IsOptional()
  @IsMongoId()
  videoId?: string;

  @ApiPropertyOptional({ example: '6995e67c9657096943bf5209' })
  @IsOptional()
  @IsMongoId()
  livestreamId?: string;
}

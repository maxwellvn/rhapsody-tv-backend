import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsMongoId,
  MinLength,
  MaxLength,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VideoVisibility } from '../../../../modules/stream/schemas/video.schema';

export class CreateVideoDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Channel ID',
  })
  @IsMongoId()
  channelId: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Program ID - associates video with a program',
  })
  @IsOptional()
  @IsMongoId()
  programId?: string;

  @ApiProperty({ example: 'My Video Title', description: 'Video title' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Video description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: 'https://example.com/video.mp4',
    description: 'Playback URL',
  })
  @IsString()
  @IsUrl()
  playbackUrl: string;

  @ApiPropertyOptional({ example: 'https://ik.imagekit.io/...' })
  @IsOptional()
  @IsString()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 3600, description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  durationSeconds?: number;

  @ApiPropertyOptional({
    enum: VideoVisibility,
    default: VideoVisibility.PUBLIC,
  })
  @IsOptional()
  @IsEnum(VideoVisibility)
  visibility?: VideoVisibility;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Mark video as featured' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class UpdateProgressDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Video ID',
  })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({
    example: 120,
    description: 'Current playback position in seconds',
  })
  @IsNumber()
  progressSeconds: number;

  @ApiProperty({
    example: 3600,
    description: 'Total duration of the video in seconds',
  })
  @IsNumber()
  durationSeconds: number;
}

export class WatchLivestreamDto {
  @ApiProperty({
    example: '507f1f77bcf86cd799439011',
    description: 'Livestream ID',
  })
  @IsString()
  @IsNotEmpty()
  livestreamId: string;
}

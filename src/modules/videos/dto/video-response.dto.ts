import { ApiProperty } from '@nestjs/swagger';

class VideoChannelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  avatar?: string;

  @ApiProperty({ default: false })
  isSubscribed: boolean;
}

export class VideoResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  thumbnail?: string;

  @ApiProperty({ required: false })
  streamUrl?: string;

  @ApiProperty({ required: false })
  duration?: number;

  @ApiProperty({ default: 0 })
  views: number;

  @ApiProperty({ default: 0 })
  likes: number;

  @ApiProperty({ default: 0 })
  dislikes: number;

  @ApiProperty({ default: false })
  isLiked: boolean;

  @ApiProperty({ default: false })
  isDisliked: boolean;

  @ApiProperty({ required: false })
  uploadDate?: string;

  @ApiProperty({ default: 'general' })
  category: string;

  @ApiProperty({ type: [String], default: [] })
  tags: string[];

  @ApiProperty({ type: () => VideoChannelResponseDto })
  channel: VideoChannelResponseDto;
}

export class PaginatedVideosResponseDto {
  @ApiProperty({ type: [VideoResponseDto] })
  items: VideoResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNext: boolean;

  @ApiProperty()
  hasPrev: boolean;
}

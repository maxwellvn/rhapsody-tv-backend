import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum CustomNotificationActionType {
  EXTERNAL_URL = 'external_url',
  CHANNEL = 'channel',
  PROGRAM = 'program',
  VIDEO = 'video',
  LIVESTREAM = 'livestream',
  OPEN_APP = 'open_app',
}

export class CreateCustomNotificationDto {
  @ApiProperty({ example: 'Check out our new feature!' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title: string;

  @ApiProperty({ example: 'We just launched something exciting.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  body: string;

  @ApiProperty({
    enum: CustomNotificationActionType,
    example: CustomNotificationActionType.EXTERNAL_URL,
  })
  @IsEnum(CustomNotificationActionType)
  actionType: CustomNotificationActionType;

  @ApiPropertyOptional({ example: 'https://example.com/promo' })
  @ValidateIf((o) => o.actionType === CustomNotificationActionType.EXTERNAL_URL)
  @IsUrl()
  actionUrl?: string;

  @ApiPropertyOptional({ example: '6995d7e889fbd0b19040153a' })
  @ValidateIf((o) => o.actionType === CustomNotificationActionType.CHANNEL)
  @IsMongoId()
  channelId?: string;

  @ApiPropertyOptional({ example: 'rhapsody-tv' })
  @ValidateIf((o) => o.actionType === CustomNotificationActionType.CHANNEL)
  @IsOptional()
  @IsString()
  channelSlug?: string;

  @ApiPropertyOptional({ example: '6996068780318cbec24cc600' })
  @ValidateIf((o) => o.actionType === CustomNotificationActionType.PROGRAM)
  @IsMongoId()
  programId?: string;

  @ApiPropertyOptional({ example: '6995e67c9657096943bf5205' })
  @ValidateIf((o) => o.actionType === CustomNotificationActionType.VIDEO)
  @IsMongoId()
  videoId?: string;

  @ApiPropertyOptional({ example: '6995e67c9657096943bf5209' })
  @ValidateIf((o) => o.actionType === CustomNotificationActionType.LIVESTREAM)
  @IsMongoId()
  livestreamId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['507f1f77bcf86cd799439011'],
    description: 'Optional target users. If omitted, sends to all active users.',
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : value ? [value] : []))
  @IsArray()
  @ArrayMaxSize(5000)
  @IsMongoId({ each: true })
  userIds?: string[];

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumbnail.jpg' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/avatar.png' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

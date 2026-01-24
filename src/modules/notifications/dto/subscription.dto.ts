import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateChannelSubscriptionSettingsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnNewVideo?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnGoLive?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyOnNewProgram?: boolean;
}

export class ChannelSubscriptionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  channelId: string;

  @ApiProperty({ example: true })
  isSubscribed: boolean;

  @ApiProperty({ example: true })
  notifyOnNewVideo: boolean;

  @ApiProperty({ example: true })
  notifyOnGoLive: boolean;

  @ApiProperty({ example: true })
  notifyOnNewProgram: boolean;
}

export class CheckSubscriptionResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  channelId: string;

  @ApiProperty({ example: true })
  isSubscribed: boolean;

  @ApiPropertyOptional({ type: ChannelSubscriptionResponseDto, nullable: true })
  subscription: ChannelSubscriptionResponseDto | null;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { NotificationType } from '../schemas';

export class NotificationDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  body: string;

  @ApiPropertyOptional({ type: Object })
  data?: Record<string, unknown>;

  @ApiProperty({ example: false })
  isRead: boolean;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt: string;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationDto] })
  notifications: NotificationDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: 3 })
  unreadCount: number;
}

export class RegisterPushTokenDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push token for this device/app install',
  })
  @IsString()
  @Matches(/^(Exponent|Expo)PushToken\[[^\]]+\]$/, {
    message: 'Invalid Expo push token format',
  })
  token: string;

  @ApiPropertyOptional({ example: 'android', enum: ['android', 'ios', 'web'] })
  @IsOptional()
  @IsString()
  @IsIn(['android', 'ios', 'web'])
  platform?: 'android' | 'ios' | 'web';
}

export class RemovePushTokenDto {
  @ApiProperty({
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    description: 'Expo push token to deactivate',
  })
  @IsString()
  @MaxLength(200)
  token: string;
}

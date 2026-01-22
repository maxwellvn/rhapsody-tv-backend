import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class UserGeneralSettingsDto {
  @ApiProperty({ example: 'en' })
  appLanguage: string;

  @ApiProperty({ example: false })
  autoRotateScreen: boolean;
}

export class UserNotificationSettingsDto {
  @ApiProperty({ example: true })
  subscriptions: boolean;

  @ApiProperty({ example: true })
  recommendedVideos: boolean;

  @ApiProperty({ example: true })
  activityOnMyComments: boolean;
}

export class UserQualitySettingsDto {
  @ApiProperty({ example: 'auto' })
  videoQualityMobile: string;

  @ApiProperty({ example: 'auto' })
  videoQualityWifi: string;

  @ApiProperty({ example: 'auto' })
  audioQuality: string;
}

export class UserDownloadSettingsDto {
  @ApiProperty({ example: 'medium' })
  downloadQuality: string;

  @ApiProperty({ example: false })
  downloadOverWifiOnly: boolean;
}

export class UserSettingsResponseDto {
  @ApiProperty({ type: UserGeneralSettingsDto })
  general: UserGeneralSettingsDto;

  @ApiProperty({ type: UserNotificationSettingsDto })
  notifications: UserNotificationSettingsDto;

  @ApiProperty({ type: UserQualitySettingsDto })
  quality: UserQualitySettingsDto;

  @ApiProperty({ type: UserDownloadSettingsDto })
  downloads: UserDownloadSettingsDto;
}

export class UpdateUserGeneralSettingsDto {
  @ApiPropertyOptional({ example: 'en' })
  @IsOptional()
  @IsString()
  appLanguage?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoRotateScreen?: boolean;
}

export class UpdateUserNotificationSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  subscriptions?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  recommendedVideos?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  activityOnMyComments?: boolean;
}

export class UpdateUserQualitySettingsDto {
  @ApiPropertyOptional({ example: 'auto' })
  @IsOptional()
  @IsString()
  videoQualityMobile?: string;

  @ApiPropertyOptional({ example: 'auto' })
  @IsOptional()
  @IsString()
  videoQualityWifi?: string;

  @ApiPropertyOptional({ example: 'auto' })
  @IsOptional()
  @IsString()
  audioQuality?: string;
}

export class UpdateUserDownloadSettingsDto {
  @ApiPropertyOptional({ example: 'medium' })
  @IsOptional()
  @IsString()
  downloadQuality?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  downloadOverWifiOnly?: boolean;
}

export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ type: UpdateUserGeneralSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserGeneralSettingsDto)
  general?: UpdateUserGeneralSettingsDto;

  @ApiPropertyOptional({ type: UpdateUserNotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserNotificationSettingsDto)
  notifications?: UpdateUserNotificationSettingsDto;

  @ApiPropertyOptional({ type: UpdateUserQualitySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserQualitySettingsDto)
  quality?: UpdateUserQualitySettingsDto;

  @ApiPropertyOptional({ type: UpdateUserDownloadSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateUserDownloadSettingsDto)
  downloads?: UpdateUserDownloadSettingsDto;
}

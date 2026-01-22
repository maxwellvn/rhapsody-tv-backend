import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Notification, NotificationSchema } from './notification.schema';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import { BroadcastNotification, BroadcastNotificationSchema } from './schemas/broadcast-notification.schema';
import { NotificationPreferences, NotificationPreferencesSchema } from './schemas/notification-preferences.schema';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationPreferencesService } from './notification-preferences.service';
import { RecommendationNotificationService } from './recommendation-notification.service';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { WatchHistory, WatchHistorySchema } from '../vod/schemas/watch-history.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: BroadcastNotification.name, schema: BroadcastNotificationSchema },
      { name: NotificationPreferences.name, schema: NotificationPreferencesSchema },
      { name: Video.name, schema: VideoSchema },
      { name: WatchHistory.name, schema: WatchHistorySchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' as const },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    PushNotificationService,
    NotificationGateway,
    NotificationPreferencesService,
    RecommendationNotificationService,
  ],
  exports: [
    NotificationService,
    PushNotificationService,
    NotificationGateway,
    NotificationPreferencesService,
  ],
})
export class NotificationModule {}

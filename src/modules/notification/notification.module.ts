import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './notification.schema';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import { BroadcastNotification, BroadcastNotificationSchema } from './schemas/broadcast-notification.schema';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: BroadcastNotification.name, schema: BroadcastNotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, PushNotificationService],
  exports: [NotificationService, PushNotificationService],
})
export class NotificationModule {}

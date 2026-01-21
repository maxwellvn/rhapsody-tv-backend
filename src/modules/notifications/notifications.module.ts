import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChannelSubscription,
  ChannelSubscriptionSchema,
  Notification,
  NotificationSchema,
} from './schemas';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: ChannelSubscription.name, schema: ChannelSubscriptionSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
  ],
  controllers: [NotificationsController, SubscriptionsController],
  providers: [NotificationsService],
  exports: [NotificationsService, MongooseModule],
})
export class NotificationsModule {}

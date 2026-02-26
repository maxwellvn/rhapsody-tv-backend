import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  ChannelSubscription,
  ChannelSubscriptionSchema,
  Notification,
  NotificationSchema,
  PushDeviceToken,
  PushDeviceTokenSchema,
} from './schemas';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import { Schedule, ScheduleSchema } from '../channel/schemas/schedule.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { LiveStream, LiveStreamSchema } from '../stream/schemas/live-stream.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: ChannelSubscription.name, schema: ChannelSubscriptionSchema },
      { name: PushDeviceToken.name, schema: PushDeviceTokenSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: Video.name, schema: VideoSchema },
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
  ],
  controllers: [NotificationsController, SubscriptionsController],
  providers: [NotificationsService],
  exports: [NotificationsService, MongooseModule],
})
export class NotificationsModule {}

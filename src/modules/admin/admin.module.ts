import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageKitModule } from '../../shared/services/imagekit/imagekit.module';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import { Subscription, SubscriptionSchema } from '../channel/schemas/subscription.schema';
import { ProgramSubscription, ProgramSubscriptionSchema } from '../channel/schemas/program-subscription.schema';
import {
  LiveStream,
  LiveStreamSchema,
} from '../stream/schemas/live-stream.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { BroadcastNotification, BroadcastNotificationSchema } from '../notification/schemas/broadcast-notification.schema';
import { AdminChannelsController } from './controllers/admin-channels.controller';
import { AdminLivestreamsController } from './controllers/admin-livestreams.controller';
import { AdminVideosController } from './controllers/admin-videos.controller';
import { AdminProgramsController } from './controllers/admin-programs.controller';
import { AdminUploadController } from './controllers/admin-upload.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminChannelsService } from './services/admin-channels.service';
import { AdminLivestreamsService } from './services/admin-livestreams.service';
import { AdminVideosService } from './services/admin-videos.service';
import { AdminProgramsService } from './services/admin-programs.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ImageKitModule,
    NotificationModule,
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: Video.name, schema: VideoSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: ProgramSubscription.name, schema: ProgramSubscriptionSchema },
      { name: BroadcastNotification.name, schema: BroadcastNotificationSchema },
    ]),
  ],
  controllers: [
    AdminChannelsController,
    AdminLivestreamsController,
    AdminVideosController,
    AdminProgramsController,
    AdminUploadController,
    AdminNotificationsController,
  ],
  providers: [
    AdminChannelsService,
    AdminLivestreamsService,
    AdminVideosService,
    AdminProgramsService,
    AdminNotificationsService,
  ],
})
export class AdminModule {}

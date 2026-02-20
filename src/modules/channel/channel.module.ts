import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { Program, ProgramSchema } from './schemas/program.schema';
import {
  ProgramSubscription,
  ProgramSubscriptionSchema,
} from './schemas/program-subscription.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { LiveStream, LiveStreamSchema } from '../stream/schemas/live-stream.schema';
import {
  ChannelSubscription,
  ChannelSubscriptionSchema,
} from '../notifications/schemas/channel-subscription.schema';
import { ChannelsController } from './channels.controller';
import { ProgramSubscriptionsController } from './program-subscriptions.controller';
import { ChannelsService } from './channels.service';
import { ProgramSubscriptionsService } from './program-subscriptions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: ProgramSubscription.name, schema: ProgramSubscriptionSchema },
      { name: Video.name, schema: VideoSchema },
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: ChannelSubscription.name, schema: ChannelSubscriptionSchema },
    ]),
  ],
  controllers: [ChannelsController, ProgramSubscriptionsController],
  providers: [ChannelsService, ProgramSubscriptionsService],
  exports: [MongooseModule, ChannelsService, ProgramSubscriptionsService],
})
export class ChannelModule {}

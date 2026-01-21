import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { Program, ProgramSchema } from './schemas/program.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { ProgramSubscription, ProgramSubscriptionSchema } from './schemas/program-subscription.schema';
import { ChannelController } from './channel.controller';
import { ProgramController } from './program.controller';
import { SubscriptionService } from './subscription.service';
import { ProgramSubscriptionService } from './program-subscription.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: ProgramSubscription.name, schema: ProgramSubscriptionSchema },
    ]),
  ],
  controllers: [ChannelController, ProgramController],
  providers: [SubscriptionService, ProgramSubscriptionService],
  exports: [MongooseModule, SubscriptionService, ProgramSubscriptionService],
})
export class ChannelModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel, ChannelSchema } from './schemas/channel.schema';
import { Program, ProgramSchema } from './schemas/program.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ChannelModule {}

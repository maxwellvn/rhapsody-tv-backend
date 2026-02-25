import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import { Schedule, ScheduleSchema } from '../channel/schemas/schedule.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { RtvApiService } from './rtv-api.service';
import { ScheduleParserService } from './schedule-parser.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: Video.name, schema: VideoSchema },
      { name: Schedule.name, schema: ScheduleSchema },
    ]),
  ],
  controllers: [SyncController],
  providers: [SyncService, RtvApiService, ScheduleParserService],
})
export class SyncModule {}

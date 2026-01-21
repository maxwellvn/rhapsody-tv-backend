import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageKitModule } from '../../shared/services/imagekit/imagekit.module';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import {
  LiveStream,
  LiveStreamSchema,
} from '../stream/schemas/live-stream.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { AdminChannelsController } from './controllers/admin-channels.controller';
import { AdminLivestreamsController } from './controllers/admin-livestreams.controller';
import { AdminVideosController } from './controllers/admin-videos.controller';
import { AdminProgramsController } from './controllers/admin-programs.controller';
import { AdminUploadController } from './controllers/admin-upload.controller';
import { AdminChannelsService } from './services/admin-channels.service';
import { AdminLivestreamsService } from './services/admin-livestreams.service';
import { AdminVideosService } from './services/admin-videos.service';
import { AdminProgramsService } from './services/admin-programs.service';

@Module({
  imports: [
    ImageKitModule,
    MongooseModule.forFeature([
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: Video.name, schema: VideoSchema },
    ]),
  ],
  controllers: [
    AdminChannelsController,
    AdminLivestreamsController,
    AdminVideosController,
    AdminProgramsController,
    AdminUploadController,
  ],
  providers: [
    AdminChannelsService,
    AdminLivestreamsService,
    AdminVideosService,
    AdminProgramsService,
  ],
})
export class AdminModule {}

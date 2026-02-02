import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageKitModule } from '../../shared/services/imagekit/imagekit.module';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { Watchlist, WatchlistSchema } from '../user/schemas/watchlist.schema';
import {
  LiveStream,
  LiveStreamSchema,
} from '../stream/schemas/live-stream.schema';
import {
  LiveStreamComment,
  LiveStreamCommentSchema,
} from '../stream/schemas/live-stream-comment.schema';
import {
  LiveStreamBan,
  LiveStreamBanSchema,
} from '../stream/schemas/live-stream-ban.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import {
  ContinueWatching,
  ContinueWatchingSchema,
} from '../stream/schemas/continue-watching.schema';
import {
  ChannelSubscription,
  ChannelSubscriptionSchema,
} from '../notifications/schemas/channel-subscription.schema';
import {
  VideoComment,
  VideoCommentSchema,
} from '../vod/schemas/video-comment.schema';
import { AdminChannelsController } from './controllers/admin-channels.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminLivestreamsController } from './controllers/admin-livestreams.controller';
import { AdminVideosController } from './controllers/admin-videos.controller';
import { AdminProgramsController } from './controllers/admin-programs.controller';
import { AdminUploadController } from './controllers/admin-upload.controller';
import { AdminChannelsService } from './services/admin-channels.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminLivestreamsService } from './services/admin-livestreams.service';
import { AdminVideosService } from './services/admin-videos.service';
import { AdminProgramsService } from './services/admin-programs.service';
import { NotificationsModule } from '../notifications';

@Module({
  imports: [
    ImageKitModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: Watchlist.name, schema: WatchlistSchema },
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: LiveStreamComment.name, schema: LiveStreamCommentSchema },
      { name: LiveStreamBan.name, schema: LiveStreamBanSchema },
      { name: ContinueWatching.name, schema: ContinueWatchingSchema },
      { name: Video.name, schema: VideoSchema },
      { name: ChannelSubscription.name, schema: ChannelSubscriptionSchema },
      { name: VideoComment.name, schema: VideoCommentSchema },
    ]),
  ],
  controllers: [
    AdminChannelsController,
    AdminDashboardController,
    AdminLivestreamsController,
    AdminVideosController,
    AdminProgramsController,
    AdminUploadController,
  ],
  providers: [
    AdminChannelsService,
    AdminDashboardService,
    AdminLivestreamsService,
    AdminVideosService,
    AdminProgramsService,
  ],
})
export class AdminModule {}

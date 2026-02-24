import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImageKitModule } from '../../shared/services/imagekit/imagekit.module';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import { Schedule, ScheduleSchema } from '../channel/schemas/schedule.schema';
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
import { AdminModerationController } from './controllers/admin-moderation.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminVideosController } from './controllers/admin-videos.controller';
import { AdminProgramsController } from './controllers/admin-programs.controller';
import { AdminSchedulesController } from './controllers/admin-schedules.controller';
import { AdminUploadController } from './controllers/admin-upload.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminChannelsService } from './services/admin-channels.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminLivestreamsService } from './services/admin-livestreams.service';
import { AdminModerationService } from './services/admin-moderation.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminVideosService } from './services/admin-videos.service';
import { AdminProgramsService } from './services/admin-programs.service';
import { AdminSchedulesService } from './services/admin-schedules.service';
import { AdminNotificationsService } from './services/admin-notifications.service';
import { NotificationsModule } from '../notifications';

@Module({
  imports: [
    ImageKitModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: Schedule.name, schema: ScheduleSchema },
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
    AdminUsersController,
    AdminModerationController,
    AdminVideosController,
    AdminProgramsController,
    AdminSchedulesController,
    AdminUploadController,
    AdminNotificationsController,
  ],
  providers: [
    AdminChannelsService,
    AdminDashboardService,
    AdminLivestreamsService,
    AdminUsersService,
    AdminModerationService,
    AdminVideosService,
    AdminProgramsService,
    AdminSchedulesService,
    AdminNotificationsService,
  ],
})
export class AdminModule {}

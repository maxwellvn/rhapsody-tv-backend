import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LiveStream, LiveStreamSchema } from './schemas/live-stream.schema';
import {
  LiveStreamComment,
  LiveStreamCommentSchema,
} from './schemas/live-stream-comment.schema';
import {
  LiveStreamBan,
  LiveStreamBanSchema,
} from './schemas/live-stream-ban.schema';
import { Video, VideoSchema } from './schemas/video.schema';
import {
  ContinueWatching,
  ContinueWatchingSchema,
} from './schemas/continue-watching.schema';
import {
  LivestreamLike,
  LivestreamLikeSchema,
} from './schemas/livestream-like.schema';
import {
  LivestreamWatchHistory,
  LivestreamWatchHistorySchema,
} from './schemas/livestream-watch-history.schema';
import { LivestreamGateway } from './gateways/livestream.gateway';
import { LivestreamChatService } from './services/livestream-chat.service';
import { LivestreamViewerService } from './services/livestream-viewer.service';
import { ContinueWatchingService } from './services/continue-watching.service';
import { LivestreamService } from './services/livestream.service';
import { LivestreamController } from './livestream.controller';
import jwtConfig from '../../config/jwt.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: LiveStreamComment.name, schema: LiveStreamCommentSchema },
      { name: LiveStreamBan.name, schema: LiveStreamBanSchema },
      { name: Video.name, schema: VideoSchema },
      { name: ContinueWatching.name, schema: ContinueWatchingSchema },
      { name: LivestreamLike.name, schema: LivestreamLikeSchema },
      { name: LivestreamWatchHistory.name, schema: LivestreamWatchHistorySchema },
    ]),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [LivestreamController],
  providers: [
    LivestreamGateway,
    LivestreamChatService,
    LivestreamViewerService,
    ContinueWatchingService,
    LivestreamService,
  ],
  exports: [
    MongooseModule,
    LivestreamChatService,
    LivestreamViewerService,
    ContinueWatchingService,
    LivestreamService,
  ],
})
export class StreamModule {}

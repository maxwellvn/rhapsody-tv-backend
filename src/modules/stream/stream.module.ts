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
import {
  LiveStreamLike,
  LiveStreamLikeSchema,
} from './schemas/live-stream-like.schema';
import { Video, VideoSchema } from './schemas/video.schema';
import {
  ContinueWatching,
  ContinueWatchingSchema,
} from './schemas/continue-watching.schema';
import { LivestreamGateway } from './gateways/livestream.gateway';
import { LivestreamChatService } from './services/livestream-chat.service';
import { LivestreamViewerService } from './services/livestream-viewer.service';
import { LivestreamLikeService } from './services/livestream-like.service';
import { ContinueWatchingService } from './services/continue-watching.service';
import jwtConfig from '../../config/jwt.config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: LiveStreamComment.name, schema: LiveStreamCommentSchema },
      { name: LiveStreamBan.name, schema: LiveStreamBanSchema },
      { name: LiveStreamLike.name, schema: LiveStreamLikeSchema },
      { name: Video.name, schema: VideoSchema },
      { name: ContinueWatching.name, schema: ContinueWatchingSchema },
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
  providers: [
    LivestreamGateway,
    LivestreamChatService,
    LivestreamViewerService,
    LivestreamLikeService,
    ContinueWatchingService,
  ],
  exports: [
    MongooseModule,
    LivestreamChatService,
    LivestreamViewerService,
    LivestreamLikeService,
    ContinueWatchingService,
  ],
})
export class StreamModule {}

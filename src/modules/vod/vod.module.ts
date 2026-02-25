import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { Channel, ChannelSchema } from '../channel/schemas/channel.schema';
import { Program, ProgramSchema } from '../channel/schemas/program.schema';
import { VideoLike, VideoLikeSchema } from './schemas/video-like.schema';
import {
  VideoComment,
  VideoCommentSchema,
} from './schemas/video-comment.schema';
import { CommentLike, CommentLikeSchema } from './schemas/comment-like.schema';
import { VodController } from './vod.controller';
import { VodService } from './vod.service';
import { NotificationsModule } from '../notifications';

@Module({
  imports: [
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Video.name, schema: VideoSchema },
      { name: Channel.name, schema: ChannelSchema },
      { name: Program.name, schema: ProgramSchema },
      { name: VideoLike.name, schema: VideoLikeSchema },
      { name: VideoComment.name, schema: VideoCommentSchema },
      { name: CommentLike.name, schema: CommentLikeSchema },
    ]),
  ],
  controllers: [VodController],
  providers: [VodService],
  exports: [VodService],
})
export class VodModule {}

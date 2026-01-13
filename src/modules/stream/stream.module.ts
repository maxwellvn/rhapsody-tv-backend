import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LiveStream, LiveStreamSchema } from './schemas/live-stream.schema';
import {
  LiveStreamComment,
  LiveStreamCommentSchema,
} from './schemas/live-stream-comment.schema';
import { Video, VideoSchema } from './schemas/video.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LiveStream.name, schema: LiveStreamSchema },
      { name: LiveStreamComment.name, schema: LiveStreamCommentSchema },
      { name: Video.name, schema: VideoSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class StreamModule {}

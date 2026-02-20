import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from './schemas/user.schema';
import { Watchlist, WatchlistSchema } from './schemas/watchlist.schema';
import { Video, VideoSchema } from '../stream/schemas/video.schema';
import { WatchlistService } from './watchlist.service';
import { WatchHistoryService } from './watch-history.service';
import { StreamModule } from '../stream';
import { ImageKitModule } from '../../shared/services/imagekit';

@Module({
  imports: [
    StreamModule,
    ImageKitModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Watchlist.name, schema: WatchlistSchema },
      { name: Video.name, schema: VideoSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, WatchlistService, WatchHistoryService],
  exports: [UserService, WatchlistService, WatchHistoryService],
})
export class UserModule {}

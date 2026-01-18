import { Module } from '@nestjs/common';
import { ChannelModule } from '../channel';
import { StreamModule } from '../stream';
import { HomepageController } from './homepage.controller';
import { HomepageService } from './homepage.service';

@Module({
  imports: [ChannelModule, StreamModule],
  controllers: [HomepageController],
  providers: [HomepageService],
})
export class HomepageModule {}

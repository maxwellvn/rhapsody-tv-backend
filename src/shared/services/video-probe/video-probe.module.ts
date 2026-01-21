import { Module, Global } from '@nestjs/common';
import { VideoProbeService } from './video-probe.service';

@Global()
@Module({
  providers: [VideoProbeService],
  exports: [VideoProbeService],
})
export class VideoProbeModule {}

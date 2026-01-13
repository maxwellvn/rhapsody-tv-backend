import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { LiveStreamStatus } from '../../../../modules/stream/schemas/live-stream.schema';

export class UpdateLivestreamStatusDto {
  @ApiProperty({ enum: LiveStreamStatus, example: LiveStreamStatus.LIVE })
  @IsEnum(LiveStreamStatus)
  status: LiveStreamStatus;
}

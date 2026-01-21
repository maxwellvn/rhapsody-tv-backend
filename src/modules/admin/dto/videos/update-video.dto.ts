import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVideoDto } from './create-video.dto';

export class UpdateVideoDto extends PartialType(
  OmitType(CreateVideoDto, ['channelId'] as const),
) {}

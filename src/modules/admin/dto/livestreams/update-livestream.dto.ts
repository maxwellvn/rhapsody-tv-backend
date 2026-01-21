import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLivestreamDto } from './create-livestream.dto';

export class UpdateLivestreamDto extends PartialType(
  OmitType(CreateLivestreamDto, ['channelId'] as const),
) {}

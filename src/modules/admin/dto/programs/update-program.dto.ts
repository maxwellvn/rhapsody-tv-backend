import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProgramDto } from './create-program.dto';

export class UpdateProgramDto extends PartialType(
  OmitType(CreateProgramDto, ['channelId'] as const),
) {}

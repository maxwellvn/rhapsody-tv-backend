import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetUserActiveDto {
  @ApiProperty({ description: 'Whether the user account is active' })
  @IsBoolean()
  isActive: boolean;
}

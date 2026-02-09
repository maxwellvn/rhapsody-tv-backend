import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetCommentDeletedDto {
  @ApiProperty({ description: 'Whether the comment is deleted (soft delete)' })
  @IsBoolean()
  isDeleted: boolean;
}

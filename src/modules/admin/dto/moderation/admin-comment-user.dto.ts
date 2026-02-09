import { ApiProperty } from '@nestjs/swagger';

export class AdminCommentUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User full name' })
  fullName: string;

  @ApiProperty({ description: 'User email' })
  email: string;
}

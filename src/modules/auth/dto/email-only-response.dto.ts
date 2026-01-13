import { ApiProperty } from '@nestjs/swagger';

export class EmailOnlyResponseDto {
  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

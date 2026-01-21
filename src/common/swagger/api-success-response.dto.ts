import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiSuccessResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 'Operation successful' })
  message: string;

  @ApiPropertyOptional({ description: 'Response payload' })
  data?: unknown;
}

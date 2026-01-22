import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KingsChatAuthDto {
  @ApiProperty({
    description: 'KingsChat access token from OAuth',
    example: 'kc_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  access_token: string;
}

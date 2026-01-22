import { IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KingsChatLoginDto {
  @ApiProperty({
    description: 'KingsChat access token obtained from OAuth flow',
    example: 'kc_access_token_xxx',
  })
  @IsNotEmpty()
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'KingsChat refresh token for token renewal',
    example: 'kc_refresh_token_xxx',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

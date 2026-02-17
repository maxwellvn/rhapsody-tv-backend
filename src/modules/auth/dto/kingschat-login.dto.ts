import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class KingsChatLoginDto {
  @ApiProperty({
    description: 'KingsChat access token returned by KingsChat OAuth flow',
    example: 'eyJhbGciOi...'
  })
  @IsString()
  @MinLength(1)
  accessToken: string;

  @ApiPropertyOptional({
    description: 'Optional KingsChat refresh token if returned by client flow',
    example: 'eyJhbGciOi...'
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

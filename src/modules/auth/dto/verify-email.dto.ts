import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address to verify',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '123456', description: '6 digit verification code' })
  @IsString()
  @Length(6, 6)
  code: string;
}

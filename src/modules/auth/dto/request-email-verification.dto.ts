import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestEmailVerificationDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address to receive verification code',
  })
  @IsEmail()
  email: string;
}

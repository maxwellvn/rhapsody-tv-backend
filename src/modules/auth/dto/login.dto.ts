import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd', description: 'Password' })
  @IsString()
  @MinLength(1)
  password: string;
}

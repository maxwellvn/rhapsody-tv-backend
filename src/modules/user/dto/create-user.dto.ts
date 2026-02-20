import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsArray,
  IsEnum,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../shared/enums/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd',
    description: 'Password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiPropertyOptional({
    enum: Role,
    isArray: true,
    example: [Role.USER],
    description: 'User roles',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Role, { each: true })
  roles?: Role[];

  @ApiPropertyOptional({
    example: 'https://ik.imagekit.io/.../avatar.jpg',
    description: 'Profile avatar URL, local upload path, or icon key (male:0/female:0)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(https?:\/\/|\/uploads\/|(?:male|female):\d+$)/i, {
    message:
      'avatar must be an http(s) URL, a local /uploads path, or an icon key like male:0',
  })
  avatar?: string;

  @ApiPropertyOptional({
    enum: ['male', 'female'],
    example: 'male',
    description: 'Optional user gender',
  })
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';
}

import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../shared/enums/role.enum';

export class UserResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({
    example: 'john_doe',
    required: false,
    description: 'Optional username, including mapped KingsChat username',
  })
  username?: string;

  @ApiProperty({
    example: 'https://ik.imagekit.io/.../avatar.jpg',
    required: false,
  })
  avatar?: string;

  @ApiProperty({
    enum: ['male', 'female'],
    required: false,
    example: 'male',
  })
  gender?: 'male' | 'female';

  @ApiProperty({ enum: Role, isArray: true, example: [Role.USER] })
  roles: Role[];

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isEmailVerified: boolean;
}

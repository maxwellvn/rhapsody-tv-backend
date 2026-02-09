import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum } from 'class-validator';
import { Role } from '../../../../shared/enums/role.enum';

export class SetUserRolesDto {
  @ApiProperty({ enum: Role, isArray: true, description: 'User roles' })
  @IsArray()
  @IsEnum(Role, { each: true })
  roles: Role[];
}

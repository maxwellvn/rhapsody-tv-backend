import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../shared/enums/role.enum';
import {
  ApiOkSuccessResponse,
} from '../../../common/swagger';
import { AdminUsersService } from '../services/admin-users.service';
import { PaginatedUsersResponseDto, UserResponseDto } from '../../user/dto';
import { SetUserActiveDto, SetUserRolesDto } from '../dto/moderation';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Users retrieved successfully',
    model: PaginatedUsersResponseDto,
  })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
    const result = await this.adminUsersService.findAll(page, limit);
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'User retrieved successfully',
    model: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    const user = await this.adminUsersService.findById(id);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Patch(':id/active')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate/deactivate user (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'User updated successfully',
    model: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setActive(@Param('id') id: string, @Body() dto: SetUserActiveDto) {
    const user = await this.adminUsersService.setActive(id, dto.isActive);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Patch(':id/roles')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Set user roles (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'User roles updated successfully',
    model: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async setRoles(@Param('id') id: string, @Body() dto: SetUserRolesDto) {
    const user = await this.adminUsersService.setRoles(id, dto.roles);
    return {
      success: true,
      message: 'User roles updated successfully',
      data: user,
    };
  }
}

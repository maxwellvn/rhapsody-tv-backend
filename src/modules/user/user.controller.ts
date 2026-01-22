import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  PaginatedUsersResponseDto,
  AddToWatchlistDto,
  PaginatedWatchlistResponseDto,
  PaginatedWatchHistoryResponseDto,
} from './dto';
import { Roles, CurrentUser } from '../../common/decorators';
import { Role } from '../../shared/enums/role.enum';
import type { UserDocument } from './schemas/user.schema';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../common/swagger';
import { WatchlistService } from './watchlist.service';
import { WatchHistoryService } from './watch-history.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly watchlistService: WatchlistService,
    private readonly watchHistoryService: WatchHistoryService,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiCreatedSuccessResponse({
    description: 'User created successfully',
    model: UserResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    return {
      success: true,
      message: 'User created successfully',
      data: user,
    };
  }

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
    const result = await this.userService.findAll(page, limit);
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: result,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkSuccessResponse({
    description: 'Profile retrieved successfully',
    model: UserResponseDto,
  })
  async getProfile(@CurrentUser() user: UserDocument) {
    const fullUser = await this.userService.findById(user._id.toString());
    return {
      success: true,
      message: 'Profile retrieved successfully',
      data: fullUser,
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
    const user = await this.userService.findById(id);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkSuccessResponse({
    description: 'Profile updated successfully',
    model: UserResponseDto,
  })
  async updateProfile(
    @CurrentUser() user: UserDocument,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // Regular users cannot change their roles or active status
    const safeUpdate: Partial<UpdateUserDto> = { ...updateUserDto };
    delete safeUpdate.isActive;
    delete safeUpdate.isEmailVerified;

    const updatedUser = await this.userService.update(
      user._id.toString(),
      safeUpdate,
    );
    return {
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser,
    };
  }

  @Get('me/watchlist')
  @ApiOperation({ summary: 'Get current user watchlist' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Watchlist retrieved successfully',
    model: PaginatedWatchlistResponseDto,
  })
  async getWatchlist(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.watchlistService.listPaginated(userId, page, limit);
    return {
      success: true,
      message: 'Watchlist retrieved successfully',
      data,
    };
  }

  @Post('me/watchlist')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a video to current user watchlist' })
  @ApiOkSuccessResponse({
    description: 'Video added to watchlist successfully',
  })
  async addToWatchlist(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddToWatchlistDto,
  ) {
    await this.watchlistService.add(userId, dto.videoId);
    return {
      success: true,
      message: 'Video added to watchlist successfully',
    };
  }

  @Delete('me/watchlist/:videoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a video from current user watchlist' })
  @ApiOkSuccessResponse({
    description: 'Video removed from watchlist successfully',
  })
  async removeFromWatchlist(
    @CurrentUser('sub') userId: string,
    @Param('videoId') videoId: string,
  ) {
    await this.watchlistService.remove(userId, videoId);
    return {
      success: true,
      message: 'Video removed from watchlist successfully',
    };
  }

  @Get('me/history')
  @ApiOperation({ summary: 'Get current user watch history' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Watch history retrieved successfully',
    model: PaginatedWatchHistoryResponseDto,
  })
  async getWatchHistory(
    @CurrentUser('sub') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const data = await this.watchHistoryService.listPaginated(
      userId,
      page,
      limit,
    );
    return {
      success: true,
      message: 'Watch history retrieved successfully',
      data,
    };
  }

  @Delete('me/history/:videoId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a video from current user watch history' })
  @ApiOkSuccessResponse({
    description: 'Video removed from watch history successfully',
  })
  async removeFromWatchHistory(
    @CurrentUser('sub') userId: string,
    @Param('videoId') videoId: string,
  ) {
    await this.watchHistoryService.remove(userId, videoId);
    return {
      success: true,
      message: 'Video removed from watch history successfully',
    };
  }

  @Delete('me/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear current user watch history' })
  @ApiOkSuccessResponse({
    description: 'Watch history cleared successfully',
  })
  async clearWatchHistory(@CurrentUser('sub') userId: string) {
    await this.watchHistoryService.clear(userId);
    return {
      success: true,
      message: 'Watch history cleared successfully',
    };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiOkSuccessResponse({
    description: 'User updated successfully',
    model: UserResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    const user = await this.userService.update(id, updateUserDto);
    return {
      success: true,
      message: 'User updated successfully',
      data: user,
    };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiOkSuccessResponse({ description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    await this.userService.remove(id);
    return {
      success: true,
      message: 'User deleted successfully',
    };
  }
}

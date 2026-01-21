import { Controller, Get, Post, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Public, CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse, ApiCreatedSuccessResponse } from '../../common/swagger';
import { Program, ProgramDocument } from './schemas/program.schema';
import { ProgramSubscriptionService } from './program-subscription.service';
import type { UserDocument } from '../user/schemas/user.schema';

@ApiTags('Programs')
@Controller('programs')
export class ProgramController {
  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,
    private readonly programSubscriptionService: ProgramSubscriptionService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active programs (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'channelId', required: false, type: String })
  @ApiOkSuccessResponse({
    description: 'Programs retrieved successfully',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('channelId') channelId?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { isActive: true };
    
    if (channelId) {
      filter.channelId = channelId;
    }

    const [programs, total] = await Promise.all([
      this.programModel
        .find(filter)
        .populate('channelId', 'name slug logoUrl coverImageUrl')
        .skip(skip)
        .limit(limit)
        .sort({ startTime: 1 }),
      this.programModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Programs retrieved successfully',
      data: {
        programs,
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Static routes MUST come before dynamic :id routes
  @Get('subscriptions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user program subscriptions (Authenticated)' })
  @ApiOkSuccessResponse({
    description: 'Subscriptions retrieved successfully',
  })
  async getSubscriptions(@CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    const programs = await this.programSubscriptionService.getSubscriptions(userId);

    return {
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: programs,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get program by ID (Public)' })
  @ApiOkSuccessResponse({
    description: 'Program retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Program not found' })
  async findOne(@Param('id') id: string) {
    const program = await this.programModel
      .findOne({
        _id: id,
        isActive: true,
      })
      .populate('channelId', 'name slug logoUrl coverImageUrl');

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return {
      success: true,
      message: 'Program retrieved successfully',
      data: program,
    };
  }

  @Post(':id/subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a program (Authenticated)' })
  @ApiCreatedSuccessResponse({
    description: 'Subscribed successfully',
  })
  @ApiResponse({ status: 404, description: 'Program not found' })
  @ApiResponse({ status: 409, description: 'Already subscribed' })
  async subscribe(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    await this.programSubscriptionService.subscribe(userId, id);

    return {
      success: true,
      message: 'Subscribed successfully',
    };
  }

  @Post(':id/unsubscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from a program (Authenticated)' })
  @ApiOkSuccessResponse({
    description: 'Unsubscribed successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async unsubscribe(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    await this.programSubscriptionService.unsubscribe(userId, id);

    return {
      success: true,
      message: 'Unsubscribed successfully',
    };
  }

  @Get(':id/subscription-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user is subscribed to a program (Authenticated)' })
  @ApiOkSuccessResponse({
    description: 'Subscription status retrieved',
  })
  async getSubscriptionStatus(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    const isSubscribed = await this.programSubscriptionService.isSubscribed(userId, id);

    return {
      success: true,
      message: 'Subscription status retrieved',
      data: { isSubscribed },
    };
  }
}

import { Controller, Get, Post, Param, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Public, CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse, ApiCreatedSuccessResponse } from '../../common/swagger';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { SubscriptionService } from './subscription.service';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import type { UserDocument } from '../user/schemas/user.schema';

@ApiTags('Channels')
@Controller('channels')
export class ChannelController {
  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all active channels (Public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkSuccessResponse({
    description: 'Channels retrieved successfully',
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const skip = (page - 1) * limit;

    const [channels, total] = await Promise.all([
      this.channelModel
        .find({ isActive: true })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.channelModel.countDocuments({ isActive: true }),
    ]);

    return {
      success: true,
      message: 'Channels retrieved successfully',
      data: {
        channels,
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
  @ApiOperation({ summary: 'Get user subscriptions (Authenticated)' })
  @ApiOkSuccessResponse({
    description: 'Subscriptions retrieved successfully',
  })
  async getSubscriptions(@CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    const channels = await this.subscriptionService.getSubscriptions(userId);

    return {
      success: true,
      message: 'Subscriptions retrieved successfully',
      data: channels,
    };
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get channel by slug (Public)' })
  @ApiOkSuccessResponse({
    description: 'Channel retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findBySlug(@Param('slug') slug: string) {
    const channel = await this.channelModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const channelId = channel._id.toString();

    // Get video count for this channel
    const videoCount = await this.videoModel.countDocuments({
      channelId: channel._id,
      isActive: true,
      visibility: 'public',
    });

    // Get subscriber count
    const subscriberCount = await this.subscriptionService.getSubscriberCount(channelId);

    // Transform to plain object and add computed fields
    const channelData = channel.toJSON();

    return {
      success: true,
      message: 'Channel retrieved successfully',
      data: {
        ...channelData,
        videoCount,
        subscriberCount,
      },
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get channel by ID (Public)' })
  @ApiOkSuccessResponse({
    description: 'Channel retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  async findOne(@Param('id') id: string) {
    const channel = await this.channelModel.findOne({
      _id: id,
      isActive: true,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Get video count for this channel
    const videoCount = await this.videoModel.countDocuments({
      channelId: new Types.ObjectId(id),
      isActive: true,
      visibility: 'public',
    });

    // Get subscriber count
    const subscriberCount = await this.subscriptionService.getSubscriberCount(id);

    // Transform to plain object and add computed fields
    const channelData = channel.toJSON();

    return {
      success: true,
      message: 'Channel retrieved successfully',
      data: {
        ...channelData,
        videoCount,
        subscriberCount,
      },
    };
  }

  @Post(':id/subscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscribe to a channel (Authenticated)' })
  @ApiCreatedSuccessResponse({
    description: 'Subscribed successfully',
  })
  @ApiResponse({ status: 404, description: 'Channel not found' })
  @ApiResponse({ status: 409, description: 'Already subscribed' })
  async subscribe(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    await this.subscriptionService.subscribe(userId, id);

    return {
      success: true,
      message: 'Subscribed successfully',
    };
  }

  @Post(':id/unsubscribe')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unsubscribe from a channel (Authenticated)' })
  @ApiOkSuccessResponse({
    description: 'Unsubscribed successfully',
  })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async unsubscribe(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    await this.subscriptionService.unsubscribe(userId, id);

    return {
      success: true,
      message: 'Unsubscribed successfully',
    };
  }

  @Get(':id/subscription-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user is subscribed to a channel (Authenticated)' })
  @ApiOkSuccessResponse({
    description: 'Subscription status retrieved',
  })
  async getSubscriptionStatus(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    const userId = user._id.toString();
    const isSubscribed = await this.subscriptionService.isSubscribed(userId, id);

    return {
      success: true,
      message: 'Subscription status retrieved',
      data: { isSubscribed },
    };
  }
}

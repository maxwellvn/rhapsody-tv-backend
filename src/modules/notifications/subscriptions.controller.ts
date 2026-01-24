import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CurrentUser } from '../../common/decorators';
import { ApiOkSuccessResponse } from '../../common/swagger';
import {
  ChannelSubscription,
  ChannelSubscriptionDocument,
} from './schemas/channel-subscription.schema';
import {
  ChannelSubscriptionResponseDto,
  CheckSubscriptionResponseDto,
  UpdateChannelSubscriptionSettingsDto,
} from './dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    @InjectModel(ChannelSubscription.name)
    private readonly subscriptionModel: Model<ChannelSubscriptionDocument>,
  ) {}

  @Get('channels/:channelId')
  @ApiOperation({
    summary: 'Check if the current user is subscribed to a channel',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiOkSuccessResponse({
    description: 'Subscription status retrieved successfully',
    model: CheckSubscriptionResponseDto,
  })
  async checkSubscription(
    @CurrentUser('sub') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      channelId: new Types.ObjectId(channelId),
    });

    const isSubscribed = subscription?.isSubscribed ?? false;

    return {
      success: true,
      message: 'Subscription status retrieved successfully',
      data: {
        channelId,
        isSubscribed,
        subscription: subscription ? this.toResponse(subscription) : null,
      },
    };
  }

  @Post('channels/:channelId')
  @ApiOperation({
    summary: 'Subscribe to a channel (creates subscription if missing)',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiOkSuccessResponse({
    description: 'Subscription updated successfully',
    model: ChannelSubscriptionResponseDto,
  })
  async subscribe(
    @CurrentUser('sub') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const updated = await this.subscriptionModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        channelId: new Types.ObjectId(channelId),
      },
      {
        $setOnInsert: {
          notifyOnNewVideo: true,
          notifyOnGoLive: true,
          notifyOnNewProgram: true,
        },
        $set: {
          isSubscribed: true,
        },
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      message: 'Subscription updated successfully',
      data: this.toResponse(updated),
    };
  }

  @Post('channels/:channelId/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from a channel' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiOkSuccessResponse({
    description: 'Subscription updated successfully',
    model: ChannelSubscriptionResponseDto,
  })
  async unsubscribe(
    @CurrentUser('sub') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const updated = await this.subscriptionModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        channelId: new Types.ObjectId(channelId),
      },
      { $set: { isSubscribed: false } },
      { new: true },
    );

    return {
      success: true,
      message: 'Subscription updated successfully',
      data: updated ? this.toResponse(updated) : undefined,
    };
  }

  @Patch('channels/:channelId/settings')
  @ApiOperation({
    summary: 'Update notification settings for a channel subscription',
  })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiOkSuccessResponse({
    description: 'Subscription settings updated successfully',
    model: ChannelSubscriptionResponseDto,
  })
  async updateSettings(
    @CurrentUser('sub') userId: string,
    @Param('channelId') channelId: string,
    @Body() dto: UpdateChannelSubscriptionSettingsDto,
  ) {
    const updated = await this.subscriptionModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        channelId: new Types.ObjectId(channelId),
      },
      {
        $setOnInsert: {
          isSubscribed: true,
        },
        $set: {
          ...(dto.notifyOnNewVideo !== undefined
            ? { notifyOnNewVideo: dto.notifyOnNewVideo }
            : {}),
          ...(dto.notifyOnGoLive !== undefined
            ? { notifyOnGoLive: dto.notifyOnGoLive }
            : {}),
          ...(dto.notifyOnNewProgram !== undefined
            ? { notifyOnNewProgram: dto.notifyOnNewProgram }
            : {}),
        },
      },
      { upsert: true, new: true },
    );

    return {
      success: true,
      message: 'Subscription settings updated successfully',
      data: this.toResponse(updated),
    };
  }

  private toResponse(
    doc: ChannelSubscriptionDocument,
  ): ChannelSubscriptionResponseDto {
    return {
      id: doc._id.toString(),
      channelId: doc.channelId.toString(),
      isSubscribed: doc.isSubscribed,
      notifyOnNewVideo: doc.notifyOnNewVideo,
      notifyOnGoLive: doc.notifyOnGoLive,
      notifyOnNewProgram: doc.notifyOnNewProgram,
    };
  }
}

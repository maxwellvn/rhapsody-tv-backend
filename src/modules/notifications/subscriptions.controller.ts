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
import { Channel, ChannelDocument } from '../channel/schemas/channel.schema';
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
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
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

    // If subscription record exists, the user is subscribed
    const isSubscribed = !!subscription;

    return {
      success: true,
      message: 'Subscription status retrieved successfully',
      data: {
        userId,
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
    const userObjectId = new Types.ObjectId(userId);
    const channelObjectId = new Types.ObjectId(channelId);

    const existing = await this.subscriptionModel.findOne({
      userId: userObjectId,
      channelId: channelObjectId,
    });

    const updated = await this.subscriptionModel.findOneAndUpdate(
      {
        userId: userObjectId,
        channelId: channelObjectId,
      },
      {
        $setOnInsert: {
          userId: userObjectId,
          channelId: channelObjectId,
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

    // Increment subscriberCount only when a new subscription is created
    if (!existing) {
      await this.channelModel.updateOne(
        { _id: channelObjectId },
        { $inc: { subscriberCount: 1 } },
      );
    }

    return {
      success: true,
      message: 'Subscribed to channel successfully',
      data: this.toResponse(updated),
    };
  }

  @Post('channels/:channelId/unsubscribe')
  @ApiOperation({ summary: 'Unsubscribe from a channel' })
  @ApiParam({ name: 'channelId', description: 'Channel ID' })
  @ApiOkSuccessResponse({
    description: 'Unsubscribed from channel successfully',
    model: ChannelSubscriptionResponseDto,
  })
  async unsubscribe(
    @CurrentUser('sub') userId: string,
    @Param('channelId') channelId: string,
  ) {
    const userObjectId = new Types.ObjectId(userId);
    const channelObjectId = new Types.ObjectId(channelId);

    // Delete the subscription record instead of just setting isSubscribed to false
    const deleted = await this.subscriptionModel.findOneAndDelete({
      userId: userObjectId,
      channelId: channelObjectId,
    });

    // Decrement subscriberCount only when a subscription was actually removed
    if (deleted) {
      await this.channelModel.updateOne(
        { _id: channelObjectId },
        { $inc: { subscriberCount: -1 } },
      );
    }

    return {
      success: true,
      message: 'Unsubscribed from channel successfully',
      data: deleted
        ? { ...this.toResponse(deleted), isSubscribed: false }
        : undefined,
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
    const userObjectId = new Types.ObjectId(userId);
    const channelObjectId = new Types.ObjectId(channelId);

    const updated = await this.subscriptionModel.findOneAndUpdate(
      {
        userId: userObjectId,
        channelId: channelObjectId,
      },
      {
        $setOnInsert: {
          userId: userObjectId,
          channelId: channelObjectId,
          isSubscribed: true,
          notifyOnNewVideo: true,
          notifyOnGoLive: true,
          notifyOnNewProgram: true,
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
      userId: doc.userId.toString(),
      channelId: doc.channelId.toString(),
      isSubscribed: doc.isSubscribed,
      notifyOnNewVideo: doc.notifyOnNewVideo,
      notifyOnGoLive: doc.notifyOnGoLive,
      notifyOnNewProgram: doc.notifyOnNewProgram,
    };
  }
}

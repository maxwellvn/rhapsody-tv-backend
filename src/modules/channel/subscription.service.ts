import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';
import { Channel, ChannelDocument } from './schemas/channel.schema';

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectModel(Subscription.name)
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Channel.name)
    private channelModel: Model<ChannelDocument>,
  ) {}

  /**
   * Subscribe a user to a channel
   */
  async subscribe(userId: string, channelId: string): Promise<void> {
    // Check if channel exists
    const channel = await this.channelModel.findById(channelId);
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    // Check if already subscribed
    const existingSubscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      channelId: new Types.ObjectId(channelId),
    });

    if (existingSubscription) {
      throw new ConflictException('Already subscribed to this channel');
    }

    // Create subscription
    await this.subscriptionModel.create({
      userId: new Types.ObjectId(userId),
      channelId: new Types.ObjectId(channelId),
    });

    // Increment subscriber count
    await this.channelModel.findByIdAndUpdate(channelId, {
      $inc: { subscriberCount: 1 },
    });
  }

  /**
   * Unsubscribe a user from a channel
   */
  async unsubscribe(userId: string, channelId: string): Promise<void> {
    const result = await this.subscriptionModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      channelId: new Types.ObjectId(channelId),
    });

    if (!result) {
      throw new NotFoundException('Subscription not found');
    }

    // Decrement subscriber count
    await this.channelModel.findByIdAndUpdate(channelId, {
      $inc: { subscriberCount: -1 },
    });
  }

  /**
   * Check if a user is subscribed to a channel
   */
  async isSubscribed(userId: string, channelId: string): Promise<boolean> {
    const subscription = await this.subscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      channelId: new Types.ObjectId(channelId),
    });
    return !!subscription;
  }

  /**
   * Get all channels a user is subscribed to
   */
  async getSubscriptions(userId: string): Promise<ChannelDocument[]> {
    const subscriptions = await this.subscriptionModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('channelId')
      .sort({ createdAt: -1 });

    return subscriptions
      .map((sub) => sub.channelId as unknown as ChannelDocument)
      .filter((channel) => channel && channel.isActive);
  }

  /**
   * Get subscription count for a channel
   */
  async getSubscriberCount(channelId: string): Promise<number> {
    return this.subscriptionModel.countDocuments({
      channelId: new Types.ObjectId(channelId),
    });
  }
}

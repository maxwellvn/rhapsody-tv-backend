import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ProgramSubscription, ProgramSubscriptionDocument } from './schemas/program-subscription.schema';
import { Program, ProgramDocument } from './schemas/program.schema';

@Injectable()
export class ProgramSubscriptionService {
  constructor(
    @InjectModel(ProgramSubscription.name)
    private programSubscriptionModel: Model<ProgramSubscriptionDocument>,
    @InjectModel(Program.name)
    private programModel: Model<ProgramDocument>,
  ) {}

  /**
   * Subscribe a user to a program
   */
  async subscribe(userId: string, programId: string): Promise<void> {
    console.log('Subscribe called with userId:', userId, 'programId:', programId);
    
    // Check if program exists
    const program = await this.programModel.findById(programId);
    if (!program) {
      console.log('Program not found:', programId);
      throw new NotFoundException('Program not found');
    }

    // Check if already subscribed
    const existingSubscription = await this.programSubscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      programId: new Types.ObjectId(programId),
    });

    if (existingSubscription) {
      console.log('Already subscribed');
      throw new ConflictException('Already subscribed to this program');
    }

    // Create subscription
    const newSub = await this.programSubscriptionModel.create({
      userId: new Types.ObjectId(userId),
      programId: new Types.ObjectId(programId),
    });
    console.log('Created subscription:', newSub);

    // Increment bookmark count on program
    await this.programModel.findByIdAndUpdate(programId, {
      $inc: { bookmarkCount: 1 },
    });
  }

  /**
   * Unsubscribe a user from a program
   */
  async unsubscribe(userId: string, programId: string): Promise<void> {
    console.log('Unsubscribe called with userId:', userId, 'programId:', programId);
    
    const result = await this.programSubscriptionModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      programId: new Types.ObjectId(programId),
    });

    console.log('Unsubscribe result:', result);

    if (!result) {
      // Check if subscription exists at all
      const existingCount = await this.programSubscriptionModel.countDocuments({
        programId: new Types.ObjectId(programId),
      });
      console.log('Total subscriptions for this program:', existingCount);
      throw new NotFoundException('Subscription not found');
    }

    // Decrement bookmark count on program
    await this.programModel.findByIdAndUpdate(programId, {
      $inc: { bookmarkCount: -1 },
    });
  }

  /**
   * Check if a user is subscribed to a program
   */
  async isSubscribed(userId: string, programId: string): Promise<boolean> {
    const subscription = await this.programSubscriptionModel.findOne({
      userId: new Types.ObjectId(userId),
      programId: new Types.ObjectId(programId),
    });
    return !!subscription;
  }

  /**
   * Get all programs a user is subscribed to
   */
  async getSubscriptions(userId: string): Promise<ProgramDocument[]> {
    const subscriptions = await this.programSubscriptionModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate({
        path: 'programId',
        populate: {
          path: 'channelId',
          select: 'name slug logoUrl',
        },
      })
      .sort({ createdAt: -1 });

    return subscriptions
      .map((sub) => sub.programId as unknown as ProgramDocument)
      .filter((program) => program && program.isActive);
  }

  /**
   * Get subscription count for a program
   */
  async getSubscriberCount(programId: string): Promise<number> {
    return this.programSubscriptionModel.countDocuments({
      programId: new Types.ObjectId(programId),
    });
  }
}

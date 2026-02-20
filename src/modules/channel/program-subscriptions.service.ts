import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ProgramSubscription,
  ProgramSubscriptionDocument,
} from './schemas/program-subscription.schema';
import { Program, ProgramDocument } from './schemas/program.schema';

@Injectable()
export class ProgramSubscriptionsService {
  constructor(
    @InjectModel(ProgramSubscription.name)
    private readonly programSubscriptionModel: Model<ProgramSubscriptionDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
  ) {}

  private toObjectId(value: string, fieldName: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${fieldName}`);
    }
    return new Types.ObjectId(value);
  }

  async subscribe(
    userId: string,
    programId: string,
  ): Promise<{ isSubscribed: boolean; subscriberCount: number }> {
    const userObjectId = this.toObjectId(userId, 'userId');
    const programObjectId = this.toObjectId(programId, 'programId');

    const program = await this.programModel.findOne({
      _id: programObjectId,
      isActive: true,
    });
    if (!program) {
      throw new NotFoundException('Program not found');
    }

    const existing = await this.programSubscriptionModel.findOne({
      userId: userObjectId,
      programId: programObjectId,
    });

    if (!existing) {
      await this.programSubscriptionModel.create({
        userId: userObjectId,
        programId: programObjectId,
      });
      await this.programModel.findByIdAndUpdate(programObjectId, {
        $inc: { bookmarkCount: 1 },
      });
    }

    const subscriberCount = await this.getSubscriberCount(programId);
    return { isSubscribed: true, subscriberCount };
  }

  async unsubscribe(
    userId: string,
    programId: string,
  ): Promise<{ isSubscribed: boolean; subscriberCount: number }> {
    const userObjectId = this.toObjectId(userId, 'userId');
    const programObjectId = this.toObjectId(programId, 'programId');

    const removed = await this.programSubscriptionModel.findOneAndDelete({
      userId: userObjectId,
      programId: programObjectId,
    });

    if (removed) {
      await this.programModel.findByIdAndUpdate(programObjectId, {
        $inc: { bookmarkCount: -1 },
      });
    }

    const subscriberCount = await this.getSubscriberCount(programId);
    return { isSubscribed: false, subscriberCount };
  }

  async isSubscribed(userId: string, programId: string): Promise<boolean> {
    const userObjectId = this.toObjectId(userId, 'userId');
    const programObjectId = this.toObjectId(programId, 'programId');

    const existing = await this.programSubscriptionModel.findOne({
      userId: userObjectId,
      programId: programObjectId,
    });

    return !!existing;
  }

  async getSubscriberCount(programId: string): Promise<number> {
    const programObjectId = this.toObjectId(programId, 'programId');
    return this.programSubscriptionModel.countDocuments({
      programId: programObjectId,
    });
  }
}

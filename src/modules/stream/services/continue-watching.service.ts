import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ContinueWatching,
  ContinueWatchingDocument,
} from '../schemas/continue-watching.schema';

@Injectable()
export class ContinueWatchingService {
  constructor(
    @InjectModel(ContinueWatching.name)
    private readonly continueWatchingModel: Model<ContinueWatchingDocument>,
  ) {}

  /**
   * Get or create a continue watching record for a user and video
   */
  async getOrCreate(
    userId: string,
    videoId: string,
    durationSeconds: number,
  ): Promise<ContinueWatchingDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const videoObjectId = new Types.ObjectId(videoId);

    let record = await this.continueWatchingModel.findOne({
      userId: userObjectId,
      videoId: videoObjectId,
    });

    if (!record) {
      record = await this.continueWatchingModel.create({
        userId: userObjectId,
        videoId: videoObjectId,
        progressSeconds: 0,
        durationSeconds,
        lastPositionSeconds: 0,
      });
    }

    return record;
  }

  /**
   * Update progress for a user watching a video
   */
  async updateProgress(
    userId: string,
    videoId: string,
    progressSeconds: number,
    durationSeconds: number,
  ): Promise<ContinueWatchingDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const videoObjectId = new Types.ObjectId(videoId);

    const result = await this.continueWatchingModel.findOneAndUpdate(
      { userId: userObjectId, videoId: videoObjectId },
      {
        $set: {
          progressSeconds,
          durationSeconds,
          lastPositionSeconds: progressSeconds,
        },
      },
      { new: true, upsert: true },
    );

    return result;
  }

  /**
   * Get all continue watching entries for a user
   */
  async getByUserId(userId: string): Promise<ContinueWatchingDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    return this.continueWatchingModel
      .find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Remove a continue watching entry
   */
  async remove(userId: string, videoId: string): Promise<void> {
    const userObjectId = new Types.ObjectId(userId);
    const videoObjectId = new Types.ObjectId(videoId);

    await this.continueWatchingModel.deleteOne({
      userId: userObjectId,
      videoId: videoObjectId,
    });
  }
}

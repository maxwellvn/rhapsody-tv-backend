import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LiveStreamLike,
  LiveStreamLikeDocument,
} from '../schemas/live-stream-like.schema';
import { LiveStream, LiveStreamDocument } from '../schemas/live-stream.schema';

@Injectable()
export class LivestreamLikeService {
  constructor(
    @InjectModel(LiveStreamLike.name)
    private readonly likeModel: Model<LiveStreamLikeDocument>,
    @InjectModel(LiveStream.name)
    private readonly livestreamModel: Model<LiveStreamDocument>,
  ) {}

  /**
   * Toggle like for a user on a livestream
   * Returns the new like count and whether the user has liked
   */
  async toggleLike(
    livestreamId: string,
    userId: string,
  ): Promise<{ likeCount: number; hasLiked: boolean }> {
    const livestreamObjectId = new Types.ObjectId(livestreamId);
    const userObjectId = new Types.ObjectId(userId);

    // Check if user already liked
    const existingLike = await this.likeModel.findOne({
      livestreamId: livestreamObjectId,
      userId: userObjectId,
    });

    let hasLiked = false;
    let increment = 0;

    if (existingLike) {
      // Unlike
      await this.likeModel.deleteOne({ _id: existingLike._id });
      hasLiked = false;
      increment = -1;
    } else {
      // Like
      await this.likeModel.create({
        livestreamId: livestreamObjectId,
        userId: userObjectId,
      });
      hasLiked = true;
      increment = 1;
    }

    // Update livestream like count
    const updatedLivestream = await this.livestreamModel.findByIdAndUpdate(
      livestreamObjectId,
      { $inc: { likeCount: increment } },
      { new: true },
    );

    return {
      likeCount: updatedLivestream?.likeCount || 0,
      hasLiked,
    };
  }

  /**
   * Check if a user has liked a livestream
   */
  async hasUserLiked(livestreamId: string, userId: string): Promise<boolean> {
    const count = await this.likeModel.countDocuments({
      livestreamId: new Types.ObjectId(livestreamId),
      userId: new Types.ObjectId(userId),
    });
    return count > 0;
  }

  /**
   * Get current like count for a livestream
   */
  async getLikeCount(livestreamId: string): Promise<number> {
    const livestream = await this.livestreamModel
      .findById(livestreamId)
      .select('likeCount');
    return livestream?.likeCount || 0;
  }
}

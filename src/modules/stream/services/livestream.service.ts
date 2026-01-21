import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamStatus,
  LiveStreamScheduleType,
} from '../schemas/live-stream.schema';
import {
  LivestreamLike,
  LivestreamLikeDocument,
} from '../schemas/livestream-like.schema';
import {
  LivestreamWatchHistory,
  LivestreamWatchHistoryDocument,
} from '../schemas/livestream-watch-history.schema';

@Injectable()
export class LivestreamService {
  constructor(
    @InjectModel(LiveStream.name)
    private livestreamModel: Model<LiveStreamDocument>,
    @InjectModel(LivestreamLike.name)
    private livestreamLikeModel: Model<LivestreamLikeDocument>,
    @InjectModel(LivestreamWatchHistory.name)
    private livestreamWatchHistoryModel: Model<LivestreamWatchHistoryDocument>,
  ) {}

  /**
   * Get all active/live livestreams
   */
  async getLivestreams(options?: {
    status?: LiveStreamStatus;
    channelId?: string;
    programId?: string;
    limit?: number;
  }): Promise<LiveStreamDocument[]> {
    const query: Record<string, unknown> = {};

    if (options?.status) {
      query.status = options.status;
    } else {
      // Default: show live and scheduled streams
      query.status = { $in: [LiveStreamStatus.LIVE, LiveStreamStatus.SCHEDULED] };
    }

    if (options?.channelId) {
      query.channelId = new Types.ObjectId(options.channelId);
    }

    if (options?.programId) {
      query.programId = new Types.ObjectId(options.programId);
    }

    return this.livestreamModel
      .find(query)
      .populate('channelId', 'name slug logoUrl')
      .populate('programId', 'name slug thumbnailUrl')
      .sort({ status: 1, scheduledStartAt: 1, createdAt: -1 })
      .limit(options?.limit || 50)
      .exec();
  }

  /**
   * Get currently live streams only
   */
  async getLiveNow(): Promise<LiveStreamDocument[]> {
    return this.livestreamModel
      .find({ status: LiveStreamStatus.LIVE })
      .populate('channelId', 'name slug logoUrl')
      .populate('programId', 'name slug thumbnailUrl')
      .sort({ startedAt: -1 })
      .exec();
  }

  /**
   * Get upcoming scheduled livestreams
   */
  async getUpcoming(limit = 10): Promise<LiveStreamDocument[]> {
    return this.livestreamModel
      .find({
        status: LiveStreamStatus.SCHEDULED,
        scheduleType: LiveStreamScheduleType.SCHEDULED,
        scheduledStartAt: { $gte: new Date() },
      })
      .populate('channelId', 'name slug logoUrl')
      .populate('programId', 'name slug thumbnailUrl')
      .sort({ scheduledStartAt: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get a single livestream by ID
   */
  async getById(id: string): Promise<LiveStreamDocument> {
    const livestream = await this.livestreamModel
      .findById(id)
      .populate('channelId', 'name slug logoUrl')
      .populate('programId', 'name slug thumbnailUrl')
      .exec();

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return livestream;
  }

  /**
   * Get livestreams by channel
   */
  async getByChannel(
    channelId: string,
    includeEnded = false,
  ): Promise<LiveStreamDocument[]> {
    // Query using ObjectId - MongoDB should handle the comparison properly
    const query: Record<string, unknown> = {
      channelId: new Types.ObjectId(channelId),
    };

    if (!includeEnded) {
      query.status = { $in: [LiveStreamStatus.LIVE, LiveStreamStatus.SCHEDULED] };
    }

    console.log('[LivestreamService] getByChannel query:', JSON.stringify(query));

    const results = await this.livestreamModel
      .find(query)
      .populate('programId', 'name slug thumbnailUrl')
      .sort({ status: 1, scheduledStartAt: 1, createdAt: -1 })
      .exec();

    console.log('[LivestreamService] getByChannel found:', results.length, 'livestreams');

    return results;
  }

  /**
   * Get livestreams by program
   */
  async getByProgram(
    programId: string,
    includeEnded = false,
  ): Promise<LiveStreamDocument[]> {
    const query: Record<string, unknown> = {
      programId: new Types.ObjectId(programId),
    };

    if (!includeEnded) {
      query.status = { $in: [LiveStreamStatus.LIVE, LiveStreamStatus.SCHEDULED] };
    }

    return this.livestreamModel
      .find(query)
      .populate('channelId', 'name slug logoUrl')
      .sort({ status: 1, scheduledStartAt: 1, createdAt: -1 })
      .exec();
  }

  // ==================== LIKE FUNCTIONALITY ====================

  /**
   * Toggle like on a livestream
   */
  async toggleLike(userId: string, livestreamId: string) {
    if (!Types.ObjectId.isValid(livestreamId)) {
      throw new BadRequestException('Invalid livestream ID');
    }

    const livestream = await this.livestreamModel.findById(livestreamId);
    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const livestreamObjectId = new Types.ObjectId(livestreamId);

    const existingLike = await this.livestreamLikeModel.findOne({
      userId: userObjectId,
      livestreamId: livestreamObjectId,
    });

    if (existingLike) {
      // Unlike: remove the like and decrement count
      await this.livestreamLikeModel.deleteOne({ _id: existingLike._id });
      await this.livestreamModel.findByIdAndUpdate(livestreamId, {
        $inc: { likeCount: -1 },
      });
      return { liked: false, message: 'Livestream unliked successfully' };
    } else {
      // Like: add the like and increment count
      await this.livestreamLikeModel.create({
        userId: userObjectId,
        livestreamId: livestreamObjectId,
      });
      await this.livestreamModel.findByIdAndUpdate(livestreamId, {
        $inc: { likeCount: 1 },
      });
      return { liked: true, message: 'Livestream liked successfully' };
    }
  }

  /**
   * Check if user liked a livestream
   */
  async getLikeStatus(userId: string, livestreamId: string) {
    if (!Types.ObjectId.isValid(livestreamId)) {
      return { liked: false, likeCount: 0 };
    }

    const livestream = await this.livestreamModel.findById(livestreamId);
    if (!livestream) {
      return { liked: false, likeCount: 0 };
    }

    const existingLike = await this.livestreamLikeModel.findOne({
      userId: new Types.ObjectId(userId),
      livestreamId: new Types.ObjectId(livestreamId),
    });

    return {
      liked: !!existingLike,
      likeCount: livestream.likeCount || 0,
    };
  }

  /**
   * Get livestream stats (viewer count, like count)
   */
  async getStats(livestreamId: string) {
    if (!Types.ObjectId.isValid(livestreamId)) {
      throw new BadRequestException('Invalid livestream ID');
    }

    const livestream = await this.livestreamModel.findById(livestreamId);
    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return {
      viewerCount: livestream.viewerCount || 0,
      likeCount: livestream.likeCount || 0,
      isLive: livestream.status === LiveStreamStatus.LIVE,
    };
  }

  /**
   * Update viewer count (called by viewer service or gateway)
   */
  async updateViewerCount(livestreamId: string, count: number) {
    await this.livestreamModel.findByIdAndUpdate(livestreamId, {
      viewerCount: count,
    });
  }

  /**
   * Increment viewer count
   */
  async incrementViewerCount(livestreamId: string) {
    await this.livestreamModel.findByIdAndUpdate(livestreamId, {
      $inc: { viewerCount: 1 },
    });
  }

  /**
   * Decrement viewer count
   */
  async decrementViewerCount(livestreamId: string) {
    await this.livestreamModel.findByIdAndUpdate(livestreamId, {
      $inc: { viewerCount: -1 },
      $max: { viewerCount: 0 }, // Ensure it doesn't go below 0
    });
  }

  /**
   * Track livestream watch (add to history)
   */
  async trackWatch(
    userId: string,
    livestreamId: string,
    watchedSeconds?: number,
  ) {
    if (!Types.ObjectId.isValid(livestreamId)) {
      throw new BadRequestException('Invalid livestream ID');
    }

    const livestream = await this.livestreamModel.findById(livestreamId);
    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const livestreamObjectId = new Types.ObjectId(livestreamId);

    await this.livestreamWatchHistoryModel.findOneAndUpdate(
      { userId: userObjectId, livestreamId: livestreamObjectId },
      {
        $set: {
          lastWatchedAt: new Date(),
          ...(watchedSeconds !== undefined && { watchedSeconds }),
        },
      },
      { upsert: true, new: true },
    );

    return { message: 'Watch history updated' };
  }

  /**
   * Get user's livestream watch history
   */
  async getWatchHistory(userId: string, page: number = 1, limit: number = 20) {
    const userObjectId = new Types.ObjectId(userId);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.livestreamWatchHistoryModel
        .find({ userId: userObjectId })
        .sort({ lastWatchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'livestreamId',
          populate: [
            { path: 'channelId', select: 'name slug logoUrl' },
            { path: 'programId', select: 'title thumbnailUrl' },
          ],
        })
        .lean(),
      this.livestreamWatchHistoryModel.countDocuments({ userId: userObjectId }),
    ]);

    return {
      items: items.map((item) => ({
        id: item._id.toString(),
        livestream: item.livestreamId,
        watchedSeconds: item.watchedSeconds,
        lastWatchedAt: item.lastWatchedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Remove livestream from watch history
   */
  async removeFromWatchHistory(userId: string, livestreamId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const livestreamObjectId = new Types.ObjectId(livestreamId);

    await this.livestreamWatchHistoryModel.deleteOne({
      userId: userObjectId,
      livestreamId: livestreamObjectId,
    });

    return { message: 'Removed from watch history' };
  }

  /**
   * Clear all livestream watch history for user
   */
  async clearWatchHistory(userId: string) {
    const userObjectId = new Types.ObjectId(userId);
    const result = await this.livestreamWatchHistoryModel.deleteMany({
      userId: userObjectId,
    });

    return { deletedCount: result.deletedCount };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  VideoComment,
  VideoCommentDocument,
} from '../../vod/schemas/video-comment.schema';
import {
  LiveStreamComment,
  LiveStreamCommentDocument,
} from '../../stream/schemas/live-stream-comment.schema';
import { Video, VideoDocument } from '../../stream/schemas/video.schema';

type PopulatedUser = {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
};

@Injectable()
export class AdminModerationService {
  constructor(
    @InjectModel(VideoComment.name)
    private readonly videoCommentModel: Model<VideoCommentDocument>,
    @InjectModel(LiveStreamComment.name)
    private readonly livestreamCommentModel: Model<LiveStreamCommentDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  private parseObjectId(value: string, label: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ${label}`);
    }
    return new Types.ObjectId(value);
  }

  private normalizePagination(page?: number, limit?: number) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;
    return { safePage, safeLimit, skip };
  }

  async listVodComments(params: {
    page?: number;
    limit?: number;
    videoId?: string;
    userId?: string;
    isDeleted?: boolean;
  }): Promise<{ comments: unknown[]; total: number; pages: number }> {
    const { safeLimit, skip } = this.normalizePagination(params.page, params.limit);

    const query: Record<string, unknown> = {};
    if (params.videoId) {
      query.videoId = this.parseObjectId(params.videoId, 'video ID');
    }
    if (params.userId) {
      query.userId = this.parseObjectId(params.userId, 'user ID');
    }
    if (typeof params.isDeleted === 'boolean') {
      query.isDeleted = params.isDeleted;
    }

    const [items, total] = await Promise.all([
      this.videoCommentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'fullName email')
        .lean(),
      this.videoCommentModel.countDocuments(query),
    ]);

    const comments = items.map((comment) => {
      const user = comment.userId as unknown as PopulatedUser;
      return {
        id: comment._id.toString(),
        videoId: comment.videoId.toString(),
        message: comment.message,
        user: {
          id: user?._id?.toString?.() ?? (comment.userId as unknown as Types.ObjectId).toString(),
          fullName: user?.fullName,
          email: user?.email,
        },
        parentCommentId: comment.parentCommentId?.toString(),
        isDeleted: comment.isDeleted,
        likeCount: comment.likeCount ?? 0,
        createdAt: (comment as unknown as { createdAt: Date }).createdAt,
        updatedAt: (comment as unknown as { updatedAt: Date }).updatedAt,
      };
    });

    return {
      comments,
      total,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async setVodCommentDeleted(
    commentId: string,
    isDeleted: boolean,
  ): Promise<unknown> {
    const commentObjectId = this.parseObjectId(commentId, 'comment ID');

    const comment = await this.videoCommentModel.findById(commentObjectId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted !== isDeleted) {
      comment.isDeleted = isDeleted;
      await comment.save();

      const inc = isDeleted ? -1 : 1;
      await this.videoModel.updateOne(
        { _id: comment.videoId },
        { $inc: { commentCount: inc } },
      );
    }

    const populated = await this.videoCommentModel
      .findById(commentObjectId)
      .populate('userId', 'fullName email')
      .lean();

    if (!populated) {
      throw new NotFoundException('Comment not found');
    }

    const user = populated.userId as unknown as PopulatedUser;
    return {
      id: populated._id.toString(),
      videoId: populated.videoId.toString(),
      message: populated.message,
      user: {
        id: user?._id?.toString?.() ?? (populated.userId as unknown as Types.ObjectId).toString(),
        fullName: user?.fullName,
        email: user?.email,
      },
      parentCommentId: populated.parentCommentId?.toString(),
      isDeleted: populated.isDeleted,
      likeCount: populated.likeCount ?? 0,
      createdAt: (populated as unknown as { createdAt: Date }).createdAt,
      updatedAt: (populated as unknown as { updatedAt: Date }).updatedAt,
    };
  }

  async listLivestreamComments(params: {
    page?: number;
    limit?: number;
    livestreamId?: string;
    userId?: string;
    isDeleted?: boolean;
  }): Promise<{ comments: unknown[]; total: number; pages: number }> {
    const { safeLimit, skip } = this.normalizePagination(params.page, params.limit);

    const query: Record<string, unknown> = {};
    if (params.livestreamId) {
      query.liveStreamId = this.parseObjectId(params.livestreamId, 'livestream ID');
    }
    if (params.userId) {
      query.userId = this.parseObjectId(params.userId, 'user ID');
    }
    if (typeof params.isDeleted === 'boolean') {
      query.isDeleted = params.isDeleted;
    }

    const [items, total] = await Promise.all([
      this.livestreamCommentModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .populate('userId', 'fullName email')
        .lean(),
      this.livestreamCommentModel.countDocuments(query),
    ]);

    const comments = items.map((comment) => {
      const user = comment.userId as unknown as PopulatedUser;
      return {
        id: comment._id.toString(),
        liveStreamId: comment.liveStreamId.toString(),
        message: comment.message,
        user: {
          id: user?._id?.toString?.() ?? (comment.userId as unknown as Types.ObjectId).toString(),
          fullName: user?.fullName,
          email: user?.email,
        },
        parentCommentId: comment.parentCommentId?.toString(),
        isDeleted: comment.isDeleted,
        createdAt: (comment as unknown as { createdAt: Date }).createdAt,
        updatedAt: (comment as unknown as { updatedAt: Date }).updatedAt,
      };
    });

    return {
      comments,
      total,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async setLivestreamCommentDeleted(
    commentId: string,
    isDeleted: boolean,
  ): Promise<unknown> {
    const commentObjectId = this.parseObjectId(commentId, 'comment ID');

    const comment = await this.livestreamCommentModel.findById(commentObjectId);
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.isDeleted !== isDeleted) {
      comment.isDeleted = isDeleted;
      await comment.save();
    }

    const populated = await this.livestreamCommentModel
      .findById(commentObjectId)
      .populate('userId', 'fullName email')
      .lean();

    if (!populated) {
      throw new NotFoundException('Comment not found');
    }

    const user = populated.userId as unknown as PopulatedUser;
    return {
      id: populated._id.toString(),
      liveStreamId: populated.liveStreamId.toString(),
      message: populated.message,
      user: {
        id: user?._id?.toString?.() ?? (populated.userId as unknown as Types.ObjectId).toString(),
        fullName: user?.fullName,
        email: user?.email,
      },
      parentCommentId: populated.parentCommentId?.toString(),
      isDeleted: populated.isDeleted,
      createdAt: (populated as unknown as { createdAt: Date }).createdAt,
      updatedAt: (populated as unknown as { updatedAt: Date }).updatedAt,
    };
  }
}

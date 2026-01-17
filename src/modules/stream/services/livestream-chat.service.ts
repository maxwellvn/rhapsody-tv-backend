import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LiveStreamComment,
  LiveStreamCommentDocument,
} from '../schemas/live-stream-comment.schema';
import {
  LiveStreamBan,
  LiveStreamBanDocument,
} from '../schemas/live-stream-ban.schema';
import { LiveStream, LiveStreamDocument } from '../schemas/live-stream.schema';

export interface CommentWithUser {
  id: string;
  content: string;
  user: {
    id: string;
    fullName: string;
  };
  parentCommentId?: string;
  createdAt: Date;
}

@Injectable()
export class LivestreamChatService {
  constructor(
    @InjectModel(LiveStreamComment.name)
    private readonly commentModel: Model<LiveStreamCommentDocument>,
    @InjectModel(LiveStream.name)
    private readonly livestreamModel: Model<LiveStreamDocument>,
    @InjectModel(LiveStreamBan.name)
    private readonly banModel: Model<LiveStreamBanDocument>,
  ) {}

  /**
   * Create a new comment
   */
  async createComment(
    livestreamId: string,
    userId: string,
    content: string,
    parentCommentId?: string,
  ): Promise<CommentWithUser> {
    const comment = await this.commentModel.create({
      liveStreamId: new Types.ObjectId(livestreamId),
      userId: new Types.ObjectId(userId),
      message: content,
      parentCommentId: parentCommentId
        ? new Types.ObjectId(parentCommentId)
        : undefined,
    });

    // Populate user info
    const populatedComment = await this.commentModel
      .findById(comment._id)
      .populate('userId', 'fullName')
      .lean();

    if (!populatedComment) {
      throw new Error('Failed to create comment');
    }

    const user = populatedComment.userId as unknown as {
      _id: Types.ObjectId;
      fullName: string;
    };

    return {
      id: populatedComment._id.toString(),
      content: populatedComment.message,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
      },
      parentCommentId: populatedComment.parentCommentId?.toString(),
      createdAt: (populatedComment as unknown as { createdAt: Date }).createdAt,
    };
  }

  /**
   * Get recent comments for a livestream
   */
  async getRecentComments(
    livestreamId: string,
    limit = 50,
  ): Promise<CommentWithUser[]> {
    const comments = await this.commentModel
      .find({
        liveStreamId: new Types.ObjectId(livestreamId),
        isDeleted: false,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'fullName')
      .lean();

    // Reverse to get chronological order
    return comments.reverse().map((comment) => {
      const user = comment.userId as unknown as {
        _id: Types.ObjectId;
        fullName: string;
      };

      return {
        id: comment._id.toString(),
        content: comment.message,
        user: {
          id: user._id.toString(),
          fullName: user.fullName,
        },
        parentCommentId: comment.parentCommentId?.toString(),
        createdAt: (comment as unknown as { createdAt: Date }).createdAt,
      };
    });
  }

  /**
   * Soft delete a comment
   */
  async deleteComment(commentId: string): Promise<boolean> {
    const result = await this.commentModel.updateOne(
      { _id: new Types.ObjectId(commentId) },
      { isDeleted: true },
    );
    return result.modifiedCount > 0;
  }

  /**
   * Get comment by ID
   */
  async getCommentById(
    commentId: string,
  ): Promise<LiveStreamCommentDocument | null> {
    return this.commentModel.findById(commentId);
  }

  /**
   * Check if user is banned from a livestream
   * Uses compound index (livestreamId, userId) for O(1) lookup
   */
  async isUserBanned(livestreamId: string, userId: string): Promise<boolean> {
    const ban = await this.banModel
      .findOne({
        livestreamId: new Types.ObjectId(livestreamId),
        userId: new Types.ObjectId(userId),
      })
      .lean();

    return ban !== null;
  }

  /**
   * Ban a user from a livestream chat
   */
  async banUser(
    livestreamId: string,
    userId: string,
    bannedBy: string,
    reason?: string,
  ): Promise<boolean> {
    try {
      await this.banModel.create({
        livestreamId: new Types.ObjectId(livestreamId),
        userId: new Types.ObjectId(userId),
        bannedBy: new Types.ObjectId(bannedBy),
        reason,
      });
      return true;
    } catch (error) {
      // Duplicate key error means user is already banned
      if ((error as { code?: number }).code === 11000) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Unban a user from a livestream chat
   */
  async unbanUser(livestreamId: string, userId: string): Promise<boolean> {
    const result = await this.banModel.deleteOne({
      livestreamId: new Types.ObjectId(livestreamId),
      userId: new Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
  }

  /**
   * Get all banned users for a livestream (for admin UI)
   */
  async getBannedUsers(
    livestreamId: string,
    limit = 100,
    skip = 0,
  ): Promise<LiveStreamBanDocument[]> {
    return this.banModel
      .find({ livestreamId: new Types.ObjectId(livestreamId) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'fullName email')
      .populate('bannedBy', 'fullName')
      .lean();
  }

  /**
   * Check if a livestream exists and has chat enabled
   */
  async isLivestreamValid(livestreamId: string): Promise<{
    exists: boolean;
    chatEnabled: boolean;
    channelId?: string;
  }> {
    const livestream = await this.livestreamModel
      .findById(livestreamId)
      .select('isChatEnabled channelId')
      .lean();

    if (!livestream) {
      return { exists: false, chatEnabled: false };
    }

    return {
      exists: true,
      chatEnabled: livestream.isChatEnabled,
      channelId: livestream.channelId.toString(),
    };
  }
}

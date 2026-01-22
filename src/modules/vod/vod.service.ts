import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import { VideoLike, VideoLikeDocument } from './schemas/video-like.schema';
import {
  VideoComment,
  VideoCommentDocument,
} from './schemas/video-comment.schema';
import { Channel, ChannelDocument } from '../channel/schemas/channel.schema';
import {
  CommentLike,
  CommentLikeDocument,
} from './schemas/comment-like.schema';
import { Watchlist, WatchlistDocument } from './schemas/watchlist.schema';
import { WatchHistory, WatchHistoryDocument } from './schemas/watch-history.schema';
import { CreateCommentDto } from './dto';

@Injectable()
export class VodService {
  constructor(
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(VideoLike.name)
    private readonly videoLikeModel: Model<VideoLikeDocument>,
    @InjectModel(VideoComment.name)
    private readonly videoCommentModel: Model<VideoCommentDocument>,
    @InjectModel(CommentLike.name)
    private readonly commentLikeModel: Model<CommentLikeDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Watchlist.name)
    private readonly watchlistModel: Model<WatchlistDocument>,
    @InjectModel(WatchHistory.name)
    private readonly watchHistoryModel: Model<WatchHistoryDocument>,
  ) {}

  /**
   * Get all public videos with pagination
   */
  async getVideos(page = 1, limit = 20, programId?: string, channelId?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = { isActive: true, visibility: 'public' };
    
    // Support both ObjectId and string formats for backward compatibility
    if (programId && Types.ObjectId.isValid(programId)) {
      filter.programId = { $in: [new Types.ObjectId(programId), programId] };
    }
    
    if (channelId && Types.ObjectId.isValid(channelId)) {
      filter.channelId = { $in: [new Types.ObjectId(channelId), channelId] };
    }

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .populate('programId', 'title')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return {
      videos: videos.map((video) => this.formatVideoResponse(video)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get videos by program ID
   */
  async getVideosByProgram(programId: string, page = 1, limit = 20) {
    if (!Types.ObjectId.isValid(programId)) {
      throw new BadRequestException('Invalid program ID');
    }
    return this.getVideos(page, limit, programId);
  }

  /**
   * Get featured videos with pagination
   */
  async getFeaturedVideos(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { isActive: true, visibility: 'public', isFeatured: true };

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .populate('programId', 'title')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return {
      videos: videos.map((video) => this.formatVideoResponse(video)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get latest videos with pagination (sorted by createdAt)
   */
  async getLatestVideos(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { isActive: true, visibility: 'public' };

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .populate('programId', 'title')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return {
      videos: videos.map((video) => this.formatVideoResponse(video)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single video by ID and increment view count
   */
  async getVideoById(videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const video = await this.videoModel
      .findOneAndUpdate(
        { _id: videoId, isActive: true },
        { $inc: { viewCount: 1 } },
        { new: true },
      )
      .populate('channelId', 'name logoUrl')
      .exec();

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return this.formatVideoResponse(video);
  }

  /**
   * Toggle like on a video (like if not liked, unlike if already liked)
   */
  async toggleLike(userId: string, videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const video = await this.videoModel.findById(videoId);
    if (!video || !video.isActive) {
      throw new NotFoundException('Video not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const videoObjectId = new Types.ObjectId(videoId);

    const existingLike = await this.videoLikeModel.findOne({
      userId: userObjectId,
      videoId: videoObjectId,
    });

    if (existingLike) {
      // Unlike: remove the like and decrement count
      await this.videoLikeModel.deleteOne({ _id: existingLike._id });
      await this.videoModel.findByIdAndUpdate(videoId, {
        $inc: { likeCount: -1 },
      });
      return { liked: false, message: 'Video unliked successfully' };
    } else {
      // Like: add the like and increment count
      await this.videoLikeModel.create({
        userId: userObjectId,
        videoId: videoObjectId,
      });
      await this.videoModel.findByIdAndUpdate(videoId, {
        $inc: { likeCount: 1 },
      });
      return { liked: true, message: 'Video liked successfully' };
    }
  }

  /**
   * Check if user has liked a video
   */
  async getLikeStatus(userId: string, videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const like = await this.videoLikeModel.findOne({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });

    return { liked: !!like };
  }

  /**
   * Get comments for a video with nested replies
   */
  async getComments(videoId: string, page = 1, limit = 20) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const skip = (page - 1) * limit;
    const videoObjectId = new Types.ObjectId(videoId);

    // Get top-level comments (no parentCommentId)
    const [topLevelComments, total] = await Promise.all([
      this.videoCommentModel
        .find({
          videoId: videoObjectId,
          parentCommentId: { $exists: false },
          isDeleted: false,
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'fullName avatar')
        .exec(),
      this.videoCommentModel.countDocuments({
        videoId: videoObjectId,
        parentCommentId: { $exists: false },
        isDeleted: false,
      }),
    ]);

    // Get all replies for these comments
    const commentIds = topLevelComments.map((c) => c._id);
    const replies = await this.videoCommentModel
      .find({
        parentCommentId: { $in: commentIds },
        isDeleted: false,
      })
      .sort({ createdAt: 1 })
      .populate('userId', 'fullName avatar')
      .exec();

    // Group replies by parent comment
    const repliesMap = new Map<string, VideoCommentDocument[]>();
    replies.forEach((reply) => {
      const parentId = reply.parentCommentId!.toString();
      if (!repliesMap.has(parentId)) {
        repliesMap.set(parentId, []);
      }
      repliesMap.get(parentId)!.push(reply);
    });

    // Format comments with their replies
    const comments = topLevelComments.map((comment) => ({
      ...this.formatCommentResponse(comment),
      replies: (repliesMap.get(comment._id.toString()) || []).map((reply) =>
        this.formatCommentResponse(reply),
      ),
    }));

    return {
      comments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Add a comment to a video
   */
  async addComment(userId: string, videoId: string, dto: CreateCommentDto) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const video = await this.videoModel.findById(videoId);
    if (!video || !video.isActive) {
      throw new NotFoundException('Video not found');
    }

    const comment = await this.videoCommentModel.create({
      videoId: new Types.ObjectId(videoId),
      userId: new Types.ObjectId(userId),
      message: dto.message,
    });

    // Increment comment count on video
    await this.videoModel.findByIdAndUpdate(videoId, {
      $inc: { commentCount: 1 },
    });

    // Populate user info
    await comment.populate('userId', 'fullName avatar');

    return this.formatCommentResponse(comment);
  }

  /**
   * Reply to a comment (one level only)
   */
  async replyToComment(
    userId: string,
    videoId: string,
    commentId: string,
    dto: CreateCommentDto,
  ) {
    if (
      !Types.ObjectId.isValid(videoId) ||
      !Types.ObjectId.isValid(commentId)
    ) {
      throw new BadRequestException('Invalid video or comment ID');
    }

    const [video, parentComment] = await Promise.all([
      this.videoModel.findById(videoId),
      this.videoCommentModel.findById(commentId),
    ]);

    if (!video || !video.isActive) {
      throw new NotFoundException('Video not found');
    }

    if (!parentComment || parentComment.isDeleted) {
      throw new NotFoundException('Parent comment not found');
    }

    // Ensure we're not replying to a reply (only one level of nesting)
    if (parentComment.parentCommentId) {
      throw new BadRequestException(
        'Cannot reply to a reply. Only one level of nesting is allowed.',
      );
    }

    const reply = await this.videoCommentModel.create({
      videoId: new Types.ObjectId(videoId),
      userId: new Types.ObjectId(userId),
      message: dto.message,
      parentCommentId: new Types.ObjectId(commentId),
    });

    // Increment comment count on video
    await this.videoModel.findByIdAndUpdate(videoId, {
      $inc: { commentCount: 1 },
    });

    // Populate user info
    await reply.populate('userId', 'fullName avatar');

    return this.formatCommentResponse(reply);
  }

  /**
   * Soft delete a comment (only by owner)
   */
  async deleteComment(userId: string, commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.videoCommentModel.findById(commentId);

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId.toString() !== userId) {
      throw new BadRequestException('You can only delete your own comments');
    }

    // Soft delete the comment
    comment.isDeleted = true;
    await comment.save();

    // Decrement comment count on video
    await this.videoModel.findByIdAndUpdate(comment.videoId, {
      $inc: { commentCount: -1 },
    });

    return { message: 'Comment deleted successfully' };
  }

  /**
   * Toggle like on a comment
   */
  async toggleCommentLike(userId: string, commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const comment = await this.videoCommentModel.findById(commentId);
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const commentObjectId = new Types.ObjectId(commentId);

    const existingLike = await this.commentLikeModel.findOne({
      userId: userObjectId,
      commentId: commentObjectId,
    });

    if (existingLike) {
      // Unlike
      await this.commentLikeModel.deleteOne({ _id: existingLike._id });
      await this.videoCommentModel.findByIdAndUpdate(commentId, {
        $inc: { likeCount: -1 },
      });
      return { liked: false, message: 'Comment unliked successfully' };
    } else {
      // Like
      await this.commentLikeModel.create({
        userId: userObjectId,
        commentId: commentObjectId,
      });
      await this.videoCommentModel.findByIdAndUpdate(commentId, {
        $inc: { likeCount: 1 },
      });
      return { liked: true, message: 'Comment liked successfully' };
    }
  }

  /**
   * Check if user has liked a comment
   */
  async getCommentLikeStatus(userId: string, commentId: string) {
    if (!Types.ObjectId.isValid(commentId)) {
      throw new BadRequestException('Invalid comment ID');
    }

    const like = await this.commentLikeModel.findOne({
      userId: new Types.ObjectId(userId),
      commentId: new Types.ObjectId(commentId),
    });

    return { liked: !!like };
  }

  /**
   * Format video response
   */
  private formatVideoResponse(video: VideoDocument) {
    const channelData = video.channelId as unknown as ChannelDocument;
    const programData = video.programId as unknown as { _id: Types.ObjectId; title: string } | undefined;
    return {
      id: video._id.toString(),
      channelId: channelData?._id?.toString() || video.channelId.toString(),
      programId: programData?._id?.toString() || video.programId?.toString(),
      title: video.title,
      description: video.description,
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl,
      durationSeconds: video.durationSeconds,
      viewCount: video.viewCount || 0,
      likeCount:
        (video as VideoDocument & { likeCount?: number }).likeCount || 0,
      commentCount:
        (video as VideoDocument & { commentCount?: number }).commentCount || 0,
      publishedAt: video.publishedAt,
      createdAt: (video as VideoDocument & { createdAt?: Date }).createdAt,
      channel: channelData
        ? {
            id: channelData._id?.toString(),
            name: channelData.name,
            logoUrl: channelData.logoUrl,
          }
        : undefined,
      program: programData
        ? {
            id: programData._id?.toString(),
            title: programData.title,
          }
        : undefined,
    };
  }

  /**
   * Format comment response
   */
  private formatCommentResponse(comment: VideoCommentDocument) {
    // Handle both populated and non-populated userId
    const userData = comment.userId as unknown as {
      _id?: Types.ObjectId;
      fullName?: string;
      avatar?: string;
    } | null;
    
    // Safely get user ID - could be ObjectId or populated object
    let userId: string;
    let fullName: string;
    let avatar: string | undefined;
    
    if (userData && typeof userData === 'object' && '_id' in userData) {
      // Populated user object
      userId = userData._id?.toString() || '';
      fullName = userData.fullName || 'Unknown User';
      avatar = userData.avatar;
    } else if (comment.userId) {
      // Non-populated ObjectId
      userId = comment.userId.toString();
      fullName = 'Unknown User';
      avatar = undefined;
    } else {
      userId = '';
      fullName = 'Unknown User';
      avatar = undefined;
    }
    
    return {
      id: comment._id.toString(),
      videoId: comment.videoId.toString(),
      message: comment.message,
      user: {
        id: userId,
        fullName,
        avatar,
      },
      parentCommentId: comment.parentCommentId?.toString(),
      likeCount: comment.likeCount || 0,
      createdAt: (comment as VideoCommentDocument & { createdAt?: Date })
        .createdAt,
    };
  }

  // ============== WATCHLIST METHODS ==============

  /**
   * Add video to watchlist (or toggle - removes if already exists)
   */
  async addToWatchlist(userId: string, videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const video = await this.videoModel.findById(videoId);
    if (!video || !video.isActive) {
      throw new NotFoundException('Video not found');
    }

    const existing = await this.watchlistModel.findOne({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });

    if (existing) {
      // Toggle behavior: remove if already in watchlist
      await this.watchlistModel.findByIdAndDelete(existing._id);
      return { message: 'Video removed from watchlist', inWatchlist: false };
    }

    await this.watchlistModel.create({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });

    return { message: 'Video added to watchlist', inWatchlist: true };
  }

  /**
   * Remove video from watchlist
   * Note: This is idempotent - returns success even if video wasn't in watchlist
   */
  async removeFromWatchlist(userId: string, videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    await this.watchlistModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });

    // Always return success - idempotent operation
    return { message: 'Video removed from watchlist' };
  }

  /**
   * Get user's watchlist
   */
  async getWatchlist(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [watchlistItems, total] = await Promise.all([
      this.watchlistModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'videoId',
          populate: { path: 'channelId', select: 'name logoUrl' },
        }),
      this.watchlistModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    const items = watchlistItems
      .filter((item) => item.videoId)
      .map((item) => {
        const video = item.videoId as unknown as VideoDocument;
        return {
          id: item._id.toString(),
          videoId: video._id.toString(),
          video: this.formatVideoResponse(video),
          addedAt: (item as any).createdAt,
        };
      });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Check if video is in watchlist
   */
  async isInWatchlist(userId: string, videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      return { inWatchlist: false };
    }

    const item = await this.watchlistModel.findOne({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });

    return { inWatchlist: !!item };
  }

  // ============== WATCH HISTORY METHODS ==============

  /**
   * Add or update watch history entry
   */
  async updateWatchHistory(
    userId: string,
    videoId: string,
    watchedSeconds: number,
    totalDurationSeconds: number,
  ) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const completed = totalDurationSeconds > 0 && 
      watchedSeconds >= totalDurationSeconds * 0.9; // 90% watched = completed

    await this.watchHistoryModel.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        videoId: new Types.ObjectId(videoId),
      },
      {
        watchedSeconds,
        totalDurationSeconds,
        lastWatchedAt: new Date(),
        completed,
      },
      { upsert: true, new: true },
    );

    return { message: 'Watch history updated' };
  }

  /**
   * Get user's watch history
   */
  async getWatchHistory(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [historyItems, total] = await Promise.all([
      this.watchHistoryModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ lastWatchedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'videoId',
          populate: { path: 'channelId', select: 'name logoUrl' },
        }),
      this.watchHistoryModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    const items = historyItems
      .filter((item) => item.videoId)
      .map((item) => {
        const video = item.videoId as unknown as VideoDocument;
        return {
          id: item._id.toString(),
          videoId: video._id.toString(),
          video: this.formatVideoResponse(video),
          watchedSeconds: item.watchedSeconds,
          totalDurationSeconds: item.totalDurationSeconds,
          lastWatchedAt: item.lastWatchedAt,
          completed: item.completed,
        };
      });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Clear watch history
   */
  async clearWatchHistory(userId: string) {
    await this.watchHistoryModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });

    return { message: 'Watch history cleared' };
  }

  /**
   * Remove single item from watch history
   */
  async removeFromWatchHistory(userId: string, videoId: string) {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const result = await this.watchHistoryModel.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });

    if (!result) {
      throw new NotFoundException('Video not in watch history');
    }

    return { message: 'Video removed from watch history' };
  }
}

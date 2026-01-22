import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import type { ChannelDocument } from '../channel/schemas/channel.schema';
import type { HomepageChannelDto, HomepageVideoDto } from '../homepage/dto';
import { Watchlist, WatchlistDocument } from './schemas/watchlist.schema';

type WatchlistRecord = {
  videoId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class WatchlistService {
  constructor(
    @InjectModel(Watchlist.name)
    private readonly watchlistModel: Model<WatchlistDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  private toChannelDto(channel: ChannelDocument): HomepageChannelDto {
    return {
      id: channel._id.toString(),
      name: channel.name,
      slug: channel.slug,
      logoUrl: channel.logoUrl,
      coverImageUrl: channel.coverImageUrl,
    };
  }

  private toVideoDto(video: VideoDocument): HomepageVideoDto {
    const populatedChannel = video.populated('channelId')
      ? (video.channelId as unknown as ChannelDocument)
      : undefined;

    return {
      id: video._id.toString(),
      title: video.title,
      description: video.description,
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl,
      durationSeconds: video.durationSeconds,
      channel: populatedChannel
        ? this.toChannelDto(populatedChannel)
        : undefined,
    };
  }

  async add(userId: string, videoId: string): Promise<void> {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    const video = await this.videoModel.findById(videoId).lean();
    if (!video || !video.isActive) {
      throw new NotFoundException('Video not found');
    }

    const userObjectId = new Types.ObjectId(userId);
    const videoObjectId = new Types.ObjectId(videoId);

    await this.watchlistModel.updateOne(
      {
        userId: userObjectId,
        videoId: videoObjectId,
      },
      { $setOnInsert: { userId: userObjectId, videoId: videoObjectId } },
      { upsert: true },
    );
  }

  async remove(userId: string, videoId: string): Promise<void> {
    if (!Types.ObjectId.isValid(videoId)) {
      throw new BadRequestException('Invalid video ID');
    }

    await this.watchlistModel.deleteOne({
      userId: new Types.ObjectId(userId),
      videoId: new Types.ObjectId(videoId),
    });
  }

  async list(
    userId: string,
  ): Promise<{ video: HomepageVideoDto; addedAt: string }[]> {
    const records = await this.watchlistModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .lean<WatchlistRecord[]>();

    if (records.length === 0) {
      return [];
    }

    const videoIds = records.map((r) => r.videoId);
    const videos = await this.videoModel
      .find({ _id: { $in: videoIds }, isActive: true })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .exec();

    const videoMap = new Map(videos.map((v) => [v._id.toString(), v]));

    return records
      .map((record) => {
        const video = videoMap.get(record.videoId.toString());
        if (!video) return null;

        const addedAtDate = record.updatedAt ?? record.createdAt;

        return {
          video: this.toVideoDto(video),
          addedAt: addedAtDate.toISOString(),
        };
      })
      .filter(
        (item): item is { video: HomepageVideoDto; addedAt: string } =>
          item !== null,
      );
  }

  async listPaginated(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResult<{ video: HomepageVideoDto; addedAt: string }>> {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const skip = (safePage - 1) * safeLimit;

    const userObjectId = new Types.ObjectId(userId);

    const [records, total] = await Promise.all([
      this.watchlistModel
        .find({ userId: userObjectId })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean<WatchlistRecord[]>(),
      this.watchlistModel.countDocuments({ userId: userObjectId }),
    ]);

    if (records.length === 0) {
      return {
        items: [],
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    }

    const videoIds = records.map((r) => r.videoId);
    const videos = await this.videoModel
      .find({ _id: { $in: videoIds }, isActive: true })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .exec();

    const videoMap = new Map(videos.map((v) => [v._id.toString(), v]));

    const items = records
      .map((record) => {
        const video = videoMap.get(record.videoId.toString());
        if (!video) return null;

        const addedAtDate = record.updatedAt ?? record.createdAt;

        return {
          video: this.toVideoDto(video),
          addedAt: addedAtDate.toISOString(),
        };
      })
      .filter(
        (item): item is { video: HomepageVideoDto; addedAt: string } =>
          item !== null,
      );

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }
}

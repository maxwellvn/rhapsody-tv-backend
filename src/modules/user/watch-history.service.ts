import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import type { ChannelDocument } from '../channel/schemas/channel.schema';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import type { HomepageChannelDto, HomepageVideoDto } from '../homepage/dto';
import { ContinueWatchingService } from '../stream/services/continue-watching.service';

type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class WatchHistoryService {
  constructor(
    private readonly continueWatchingService: ContinueWatchingService,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  private getWatchedAt(record: unknown): Date {
    const r = record as { updatedAt?: Date; createdAt?: Date };
    return r.updatedAt ?? r.createdAt ?? new Date(0);
  }

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

  async list(userId: string): Promise<
    {
      video: HomepageVideoDto;
      progressSeconds: number;
      durationSeconds: number;
      watchedAt: string;
    }[]
  > {
    const records = await this.continueWatchingService.getByUserId(userId);
    if (records.length === 0) return [];

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

        const watchedAtDate = this.getWatchedAt(record);

        return {
          video: this.toVideoDto(video),
          progressSeconds: record.progressSeconds,
          durationSeconds: record.durationSeconds,
          watchedAt: watchedAtDate.toISOString(),
        };
      })
      .filter(
        (
          item,
        ): item is {
          video: HomepageVideoDto;
          progressSeconds: number;
          durationSeconds: number;
          watchedAt: string;
        } => item !== null,
      );
  }

  async listPaginated(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<
    PaginatedResult<{
      video: HomepageVideoDto;
      progressSeconds: number;
      durationSeconds: number;
      watchedAt: string;
    }>
  > {
    const safePage = Math.max(page, 1);
    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const [records, total] = await Promise.all([
      this.continueWatchingService.getPaginatedByUserId(
        userId,
        safePage,
        safeLimit,
      ),
      this.continueWatchingService.countByUserId(userId),
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

        const watchedAtDate = this.getWatchedAt(record);

        return {
          video: this.toVideoDto(video),
          progressSeconds: record.progressSeconds,
          durationSeconds: record.durationSeconds,
          watchedAt: watchedAtDate.toISOString(),
        };
      })
      .filter(
        (
          item,
        ): item is {
          video: HomepageVideoDto;
          progressSeconds: number;
          durationSeconds: number;
          watchedAt: string;
        } => item !== null,
      );

    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async remove(userId: string, videoId: string): Promise<void> {
    await this.continueWatchingService.remove(userId, videoId);
  }

  async clear(userId: string): Promise<void> {
    await this.continueWatchingService.clearByUserId(userId);
  }
}

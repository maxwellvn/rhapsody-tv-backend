import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { Program, ProgramDocument } from './schemas/program.schema';
import {
  Video,
  VideoDocument,
  VideoVisibility,
} from '../stream/schemas/video.schema';
import type {
  ChannelDetailsDto,
  ChannelDetailsResponseDto,
  ChannelProgramDto,
  ChannelVideoListItemDto,
  ChannelVideosPaginatedDto,
} from './dto';

@Injectable()
export class ChannelsService {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  private toChannelDetailsDto(channel: ChannelDocument): ChannelDetailsDto {
    return {
      id: channel._id.toString(),
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      logoUrl: channel.logoUrl,
      coverImageUrl: channel.coverImageUrl,
      websiteUrl: channel.websiteUrl,
      subscriberCount: channel.subscriberCount || 0,
      videoCount: channel.videoCount || 0,
      joinedAt: (channel as ChannelDocument & { createdAt?: Date }).createdAt
        ? (
            channel as ChannelDocument & { createdAt?: Date }
          ).createdAt!.toISOString()
        : new Date().toISOString(),
    };
  }

  private toVideoListItemDto(video: VideoDocument): ChannelVideoListItemDto {
    return {
      id: video._id.toString(),
      title: video.title,
      description: video.description,
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl,
      durationSeconds: video.durationSeconds,
      viewCount: video.viewCount || 0,
      publishedAt: video.publishedAt
        ? video.publishedAt.toISOString()
        : undefined,
    };
  }

  private toProgramDto(program: ProgramDocument): ChannelProgramDto {
    return {
      id: program._id.toString(),
      title: program.title,
      description: program.description,
      startTime: program.startTime.toISOString(),
      endTime: program.endTime.toISOString(),
      durationInMinutes: program.durationInMinutes,
      category: program.category,
      isLive: program.isLive,
      viewerCount: program.viewerCount || 0,
      bookmarkCount: program.bookmarkCount || 0,
      videoId: program.videoId?.toString(),
      liveStreamId: program.liveStreamId?.toString(),
    };
  }

  async getChannelDetailsBySlug(
    slug: string,
    latestVideosLimit = 10,
  ): Promise<ChannelDetailsResponseDto> {
    const channel = await this.channelModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const latestVideos = await this.videoModel
      .find({
        channelId: channel._id,
        isActive: true,
        visibility: VideoVisibility.PUBLIC,
      })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(latestVideosLimit);

    return {
      channel: this.toChannelDetailsDto(channel),
      latestVideos: latestVideos.map((v) => this.toVideoListItemDto(v)),
    };
  }

  async getChannelVideosBySlug(
    slug: string,
    page = 1,
    limit = 20,
  ): Promise<ChannelVideosPaginatedDto> {
    const channel = await this.channelModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const filter = {
      channelId: channel._id,
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      this.videoModel.countDocuments(filter),
    ]);

    return {
      videos: videos.map((v) => this.toVideoListItemDto(v)),
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getChannelScheduleBySlug(
    slug: string,
    date?: string,
    limit = 50,
  ): Promise<ChannelProgramDto[]> {
    const channel = await this.channelModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const query: Record<string, unknown> = {
      channelId: channel._id,
      isActive: true,
    };

    if (date) {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid date');
      }

      const startOfDay = new Date(parsed);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(parsed);
      endOfDay.setHours(23, 59, 59, 999);

      query.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));

    const programs = await this.programModel
      .find(query)
      .sort({ startTime: 1 })
      .limit(safeLimit);

    return programs.map((p) => this.toProgramDto(p));
  }
}

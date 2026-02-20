import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from '../channel/schemas/channel.schema';
import { Program, ProgramDocument } from '../channel/schemas/program.schema';
import {
  Video,
  VideoDocument,
  VideoVisibility,
} from '../stream/schemas/video.schema';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamStatus,
} from '../stream/schemas/live-stream.schema';
import { ContinueWatchingService } from '../stream/services/continue-watching.service';
import type {
  HomepageChannelDto,
  HomepageProgramDto,
  HomepageVideoDto,
  HomepageContinueWatchingDto,
} from './dto';

@Injectable()
export class HomepageService {
  private readonly PRIMARY_HOME_CHANNEL_SLUG = 'rhapsody-tv';

  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(LiveStream.name)
    private readonly liveStreamModel: Model<LiveStreamDocument>,
    private readonly continueWatchingService: ContinueWatchingService,
  ) {}

  private toIsoStringSafe(value: unknown, fallback = new Date()): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
    return fallback.toISOString();
  }

  private resolveProgramWindow(
    program: ProgramDocument,
    referenceDate = new Date(),
  ): { startTime: Date; endTime: Date } | null {
    if (!program.startTimeOfDay || !program.endTimeOfDay) {
      const startTime = new Date(program.startTime);
      const endTime = new Date(program.endTime);
      if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return null;
      }
      return { startTime, endTime };
    }

    if (
      program.scheduleType === 'weekly' &&
      program.daysOfWeek?.length &&
      !program.daysOfWeek.includes(referenceDate.getUTCDay())
    ) {
      return null;
    }

    if (program.startTime && referenceDate < new Date(program.startTime)) {
      return null;
    }

    if (program.endTime && referenceDate > new Date(program.endTime)) {
      return null;
    }

    const [startHours, startMinutes] = program.startTimeOfDay.split(':').map(Number);
    const [endHours, endMinutes] = program.endTimeOfDay.split(':').map(Number);

    const startTime = new Date(referenceDate);
    startTime.setUTCHours(startHours, startMinutes, 0, 0);

    const endTime = new Date(referenceDate);
    endTime.setUTCHours(endHours, endMinutes, 0, 0);
    if (endTime <= startTime) {
      endTime.setUTCDate(endTime.getUTCDate() + 1);
    }

    return { startTime, endTime };
  }

  private toChannelDto(channel: ChannelDocument): HomepageChannelDto {
    return {
      id: channel._id.toString(),
      name: channel.name,
      slug: channel.slug,
      logoUrl: channel.logoUrl,
      coverImageUrl: channel.coverImageUrl,
      defaultLiveStreamId: channel.defaultLiveStreamId?.toString(),
    };
  }

  private resolvePopulatedChannel(value: unknown): ChannelDocument | undefined {
    return value && typeof value === 'object' && 'name' in value
      ? (value as ChannelDocument)
      : undefined;
  }

  private toLivestreamProgramDto(
    livestream: LiveStreamDocument,
    isDefaultForChannel = false,
  ): HomepageProgramDto {
    const now = new Date();
    const channelValue = (livestream as unknown as { channelId?: unknown })
      .channelId;
    const populatedChannel = this.resolvePopulatedChannel(channelValue);

    return {
      id: livestream._id.toString(),
      title: livestream.title,
      description: livestream.description,
      scheduleType: livestream.scheduleType,
      startTime: livestream.startedAt?.toISOString() || now.toISOString(),
      endTime: livestream.endedAt?.toISOString() || now.toISOString(),
      isLive: livestream.status === LiveStreamStatus.LIVE,
      status: livestream.status,
      channel: populatedChannel
        ? this.toChannelDto(populatedChannel)
        : undefined,
      videoId: undefined,
      liveStreamId: livestream._id.toString(),
      playbackUrl: livestream.playbackUrl,
      thumbnailUrl: livestream.thumbnailUrl,
      isChatEnabled: livestream.isChatEnabled,
      rtmpUrl: livestream.rtmpUrl,
      isDefaultForChannel,
    };
  }

  private toProgramDto(program: ProgramDocument): HomepageProgramDto {
    const channelValue = (program as unknown as { channelId?: unknown })
      .channelId;
    const populatedChannel = this.resolvePopulatedChannel(channelValue);

    const window = this.resolveProgramWindow(program) ?? {
      startTime: new Date(program.startTime),
      endTime: new Date(program.endTime),
    };

    return {
      id: program._id.toString(),
      title: program.title,
      description: program.description,
      scheduleType: program.scheduleType,
      startTimeOfDay: program.startTimeOfDay,
      endTimeOfDay: program.endTimeOfDay,
      daysOfWeek: program.daysOfWeek,
      timezone: program.timezone,
      startTime: this.toIsoStringSafe(window.startTime),
      endTime: this.toIsoStringSafe(window.endTime),
      isLive:
        program.isLive ||
        (new Date() >= window.startTime && new Date() <= window.endTime),
      channel: populatedChannel
        ? this.toChannelDto(populatedChannel)
        : undefined,
      videoId: program.videoId?.toString(),
      liveStreamId: program.liveStreamId?.toString(),
    };
  }

  toVideoDto(video: VideoDocument): HomepageVideoDto {
    const channelValue = (video as unknown as { channelId?: unknown })
      .channelId;
    const populatedChannel =
      channelValue && typeof channelValue === 'object' && 'name' in channelValue
        ? (channelValue as ChannelDocument)
        : undefined;

    return {
      id: video._id.toString(),
      title: video.title,
      description: video.description,
      playbackUrl: video.playbackUrl,
      thumbnailUrl: video.thumbnailUrl,
      durationSeconds: video.durationSeconds,
      isFeatured: video.isFeatured,
      featuredOrder: video.featuredOrder,
      channel: populatedChannel
        ? this.toChannelDto(populatedChannel)
        : undefined,
    };
  }

  async getLiveNow(): Promise<HomepageProgramDto | null> {
    const livestreams = await this.getLiveStreams(1);
    return livestreams[0] ?? null;
  }

  async getLiveStreams(limit = 10): Promise<HomepageProgramDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const livestreams = await this.liveStreamModel
      .find({ status: LiveStreamStatus.LIVE })
      .populate('channelId', 'name slug logoUrl coverImageUrl defaultLiveStreamId')
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(safeLimit);

    return livestreams.map((livestream) => {
      const channelValue = (livestream as unknown as { channelId?: unknown })
        .channelId;
      const channel = this.resolvePopulatedChannel(channelValue);
      const isDefaultForChannel =
        channel?.defaultLiveStreamId?.toString() === livestream._id.toString();

      return this.toLivestreamProgramDto(livestream, isDefaultForChannel);
    });
  }

  async getContinueWatching(
    userId: string,
  ): Promise<HomepageContinueWatchingDto[]> {
    const continueWatchingRecords =
      await this.continueWatchingService.getByUserId(userId);

    if (continueWatchingRecords.length === 0) {
      return [];
    }

    const videoIds = continueWatchingRecords.map((r) => r.videoId);
    const videos = await this.videoModel
      .find({ _id: { $in: videoIds }, isActive: true })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .lean();

    const videoMap = new Map(videos.map((v) => [v._id.toString(), v]));

    return continueWatchingRecords
      .map((record) => {
        const video = videoMap.get(record.videoId.toString());
        if (!video) return null;

        return {
          video: this.toVideoDto(video),
          progressSeconds: record.progressSeconds,
          durationSeconds: record.durationSeconds,
        } as HomepageContinueWatchingDto;
      })
      .filter((item): item is HomepageContinueWatchingDto => item !== null);
  }

  async getChannels(limit = 10): Promise<HomepageChannelDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const channels = await this.channelModel.find({ isActive: true }).sort({
      createdAt: -1,
    });

    const defaultLiveStreamIds = channels
      .map((channel) => channel.defaultLiveStreamId?.toString())
      .filter((id): id is string => !!id);

    const liveDefaultIds = new Set<string>();

    if (defaultLiveStreamIds.length > 0) {
      const liveDefaults = await this.liveStreamModel
        .find({
          _id: { $in: defaultLiveStreamIds },
          status: LiveStreamStatus.LIVE,
        })
        .select('_id')
        .lean();

      liveDefaults.forEach((stream) => {
        liveDefaultIds.add(stream._id.toString());
      });
    }

    const sorted = [...channels].sort((a, b) => {
      const aIsPrimary = a.slug === this.PRIMARY_HOME_CHANNEL_SLUG;
      const bIsPrimary = b.slug === this.PRIMARY_HOME_CHANNEL_SLUG;

      if (aIsPrimary !== bIsPrimary) {
        return aIsPrimary ? -1 : 1;
      }

      const aDefaultId = a.defaultLiveStreamId?.toString();
      const bDefaultId = b.defaultLiveStreamId?.toString();

      const aHasLiveDefault = aDefaultId ? liveDefaultIds.has(aDefaultId) : false;
      const bHasLiveDefault = bDefaultId ? liveDefaultIds.has(bDefaultId) : false;

      if (aHasLiveDefault !== bHasLiveDefault) {
        return aHasLiveDefault ? -1 : 1;
      }

      const aHasDefault = !!aDefaultId;
      const bHasDefault = !!bDefaultId;

      if (aHasDefault !== bHasDefault) {
        return aHasDefault ? -1 : 1;
      }

      const aCreatedAt = (
        a as unknown as { createdAt?: Date | string | number }
      ).createdAt;
      const bCreatedAt = (
        b as unknown as { createdAt?: Date | string | number }
      ).createdAt;

      return (
        new Date(bCreatedAt ?? 0).getTime() - new Date(aCreatedAt ?? 0).getTime()
      );
    });

    return sorted.slice(0, safeLimit).map((c) => this.toChannelDto(c));
  }

  async getPrograms(limit = 10): Promise<HomepageProgramDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const programs = await this.programModel
      .find({ isActive: true })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ isLive: -1, createdAt: -1, startTime: 1 })
      .limit(safeLimit);

    return programs.map((p) => this.toProgramDto(p));
  }

  async getFeaturedVideos(limit = 10): Promise<HomepageVideoDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const videos = await this.videoModel
      .find({
        isActive: true,
        isFeatured: true,
        visibility: VideoVisibility.PUBLIC,
      })
      .limit(safeLimit)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ featuredOrder: 1, publishedAt: -1, createdAt: -1 });
    return videos.map((v) => this.toVideoDto(v));
  }

  async getProgramHighlights(limit = 10): Promise<HomepageVideoDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const videos = await this.videoModel
      .find({
        isActive: true,
        visibility: VideoVisibility.PUBLIC,
      })
      .limit(safeLimit)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ viewCount: -1, publishedAt: -1, createdAt: -1 });
    return videos.map((v) => this.toVideoDto(v));
  }

  async getVideoById(videoId: string): Promise<VideoDocument | null> {
    return this.videoModel
      .findById(videoId)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .exec();
  }

  async backfillVideoDuration(
    videoId: string,
    durationSeconds: number,
  ): Promise<void> {
    const safeDuration = Math.max(0, Math.floor(durationSeconds));
    if (safeDuration <= 0) return;

    await this.videoModel.updateOne(
      {
        _id: videoId,
        $or: [
          { durationSeconds: { $exists: false } },
          { durationSeconds: null },
          { durationSeconds: 0 },
        ],
      },
      { $set: { durationSeconds: safeDuration } },
    );
  }

  async getLivestreamById(
    livestreamId: string,
  ): Promise<HomepageProgramDto | null> {
    const livestream = await this.liveStreamModel
      .findById(livestreamId)
      .populate('channelId', 'name slug logoUrl coverImageUrl defaultLiveStreamId');

    if (!livestream) {
      return null;
    }

    const program = await this.programModel
      .findOne({
        liveStreamId: livestream._id,
        isActive: true,
      })
      .populate('channelId', 'name slug logoUrl coverImageUrl defaultLiveStreamId');

    const channelValue = (livestream as unknown as { channelId?: unknown })
      .channelId;
    const channel = this.resolvePopulatedChannel(channelValue);
    const isDefaultForChannel =
      channel?.defaultLiveStreamId?.toString() === livestream._id.toString();

    if (program) {
      return {
        ...this.toProgramDto(program),
        playbackUrl: livestream.playbackUrl,
        thumbnailUrl: livestream.thumbnailUrl,
        isChatEnabled: livestream.isChatEnabled,
        rtmpUrl: livestream.rtmpUrl,
        status: livestream.status,
        isDefaultForChannel,
      };
    }

    return this.toLivestreamProgramDto(livestream, isDefaultForChannel);
  }
}

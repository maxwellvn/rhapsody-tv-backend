import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Channel, ChannelDocument } from './schemas/channel.schema';
import { Program, ProgramDocument } from './schemas/program.schema';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamStatus,
} from '../stream/schemas/live-stream.schema';
import {
  Video,
  VideoDocument,
  VideoVisibility,
} from '../stream/schemas/video.schema';
import {
  ChannelSubscription,
  ChannelSubscriptionDocument,
} from '../notifications/schemas/channel-subscription.schema';
import type {
  ChannelDetailsDto,
  ChannelDetailsResponseDto,
  ChannelLivestreamDto,
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
    @InjectModel(LiveStream.name)
    private readonly liveStreamModel: Model<LiveStreamDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(ChannelSubscription.name)
    private readonly subscriptionModel: Model<ChannelSubscriptionDocument>,
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

  private buildIdCandidates(value: unknown): Array<string | Types.ObjectId> {
    if (value === undefined || value === null) {
      return [];
    }

    const candidates: Array<string | Types.ObjectId> = [];

    if (value instanceof Types.ObjectId) {
      candidates.push(value);
    }

    const stringValue = String(value);
    if (!candidates.includes(stringValue)) {
      candidates.push(stringValue);
    }

    if (Types.ObjectId.isValid(stringValue)) {
      const objectIdValue = new Types.ObjectId(stringValue);
      const hasSameObjectId = candidates.some(
        (candidate) =>
          candidate instanceof Types.ObjectId &&
          candidate.equals(objectIdValue),
      );
      if (!hasSameObjectId) {
        candidates.push(objectIdValue);
      }
    }

    return candidates;
  }

  private buildChannelIdFilter(
    channel: ChannelDocument,
  ): { $in: Array<string | Types.ObjectId> } {
    return {
      $in: this.buildIdCandidates(channel._id),
    };
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

  private toChannelDetailsDto(
    channel: ChannelDocument,
    subscriberCount: number,
    defaultLiveStreamId?: string,
  ): ChannelDetailsDto {
    return {
      id: channel._id.toString(),
      name: channel.name,
      slug: channel.slug,
      description: channel.description,
      logoUrl: channel.logoUrl,
      coverImageUrl: channel.coverImageUrl,
      websiteUrl: channel.websiteUrl,
      defaultLiveStreamId,
      subscriberCount,
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
      programId: (video as VideoDocument & { programId?: Types.ObjectId })
        .programId?.toString(),
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

  private toProgramDto(
    program: ProgramDocument,
    fallbackLiveStreamId?: string,
  ): ChannelProgramDto {
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
      durationInMinutes: program.durationInMinutes,
      category: program.category,
      isLive: program.isLive,
      viewerCount: program.viewerCount || 0,
      bookmarkCount: program.bookmarkCount || 0,
      videoId: program.videoId?.toString(),
      liveStreamId: program.liveStreamId?.toString() || fallbackLiveStreamId,
    };
  }

  private toLivestreamDto(
    livestream: LiveStreamDocument,
    defaultLiveStreamId?: string,
  ): ChannelLivestreamDto {
    const livestreamId = livestream._id.toString();

    return {
      id: livestreamId,
      title: livestream.title,
      description: livestream.description,
      scheduleType: livestream.scheduleType,
      status: livestream.status,
      scheduledStartAt: livestream.scheduledStartAt?.toISOString(),
      scheduledEndAt: livestream.scheduledEndAt?.toISOString(),
      startedAt: livestream.startedAt?.toISOString(),
      endedAt: livestream.endedAt?.toISOString(),
      thumbnailUrl: livestream.thumbnailUrl,
      playbackUrl: livestream.playbackUrl,
      isChatEnabled: livestream.isChatEnabled,
      isDefaultForChannel: defaultLiveStreamId === livestreamId,
    };
  }

  private async resolveChannelDefaultLiveStreamId(
    channel: ChannelDocument,
  ): Promise<string | undefined> {
    if (!channel.defaultLiveStreamId) {
      return undefined;
    }

    const defaultLiveStreamIdCandidates = this.buildIdCandidates(
      channel.defaultLiveStreamId,
    );
    if (defaultLiveStreamIdCandidates.length === 0) {
      return undefined;
    }

    const defaultLivestream = await this.liveStreamModel
      .findOne({
        _id: { $in: defaultLiveStreamIdCandidates },
        channelId: this.buildChannelIdFilter(channel),
      })
      .select('_id')
      .lean();

    return defaultLivestream?._id ? String(defaultLivestream._id) : undefined;
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

    const channelIdFilter = this.buildChannelIdFilter(channel);
    const [latestVideos, subscriberCount] = await Promise.all([
      this.videoModel
        .find({
          channelId: channelIdFilter,
          isActive: true,
          visibility: VideoVisibility.PUBLIC,
        })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(latestVideosLimit),
      this.subscriptionModel.countDocuments({ channelId: channelIdFilter }),
    ]);
    const defaultLiveStreamId =
      await this.resolveChannelDefaultLiveStreamId(channel);

    const videoIdsWithoutDuration = latestVideos
      .filter((v) => !v.durationSeconds || v.durationSeconds <= 0)
      .map((v) => v._id);
    const programDurationMap = new Map<string, number>();
    if (videoIdsWithoutDuration.length > 0) {
      const videoIdCandidates = videoIdsWithoutDuration.flatMap((videoId) =>
        this.buildIdCandidates(videoId),
      );
      const programs = await this.programModel
        .find({
          videoId: { $in: videoIdCandidates },
          durationInMinutes: { $gt: 0 },
        })
        .select({ videoId: 1, durationInMinutes: 1 })
        .lean();
      for (const program of programs) {
        if (program.videoId && program.durationInMinutes) {
          programDurationMap.set(
            String(program.videoId),
            Math.floor(program.durationInMinutes * 60),
          );
        }
      }
    }

    return {
      channel: this.toChannelDetailsDto(
        channel,
        subscriberCount,
        defaultLiveStreamId,
      ),
      latestVideos: latestVideos.map((v) => {
        const dto = this.toVideoListItemDto(v);
        if (!dto.durationSeconds || dto.durationSeconds <= 0) {
          dto.durationSeconds = programDurationMap.get(dto.id);
        }
        return dto;
      }),
    };
  }

  async getChannelVideosBySlug(
    slug: string,
    page = 1,
    limit = 20,
    programId?: string,
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

    const channelIdFilter = this.buildChannelIdFilter(channel);
    const filter: Record<string, unknown> = {
      channelId: channelIdFilter,
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    if (programId) {
      const programIdCandidates = this.buildIdCandidates(programId);
      if (programIdCandidates.length === 0) {
        throw new BadRequestException('Invalid programId');
      }

      const selectedProgram = await this.programModel
        .findOne({
          _id: { $in: programIdCandidates },
          channelId: channelIdFilter,
          isActive: true,
        })
        .select({ _id: 1, videoId: 1 })
        .lean();

      const linkedProgramIds = selectedProgram?._id
        ? this.buildIdCandidates(selectedProgram._id)
        : programIdCandidates;
      const fallbackVideoIds = selectedProgram?.videoId
        ? this.buildIdCandidates(selectedProgram.videoId)
        : [];

      filter.$or = [
        { programId: { $in: linkedProgramIds } },
        ...(fallbackVideoIds.length > 0
          ? ([{ _id: { $in: fallbackVideoIds } }] as Record<string, unknown>[])
          : []),
      ];
    }

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      this.videoModel.countDocuments(filter),
    ]);

    const videoIdsWithoutDuration = videos
      .filter((v) => !v.durationSeconds || v.durationSeconds <= 0)
      .map((v) => v._id);
    const programDurationMap = new Map<string, number>();
    if (videoIdsWithoutDuration.length > 0) {
      const videoIdCandidates = videoIdsWithoutDuration.flatMap((videoId) =>
        this.buildIdCandidates(videoId),
      );
      const programs = await this.programModel
        .find({
          videoId: { $in: videoIdCandidates },
          durationInMinutes: { $gt: 0 },
        })
        .select({ videoId: 1, durationInMinutes: 1 })
        .lean();
      for (const program of programs) {
        if (program.videoId && program.durationInMinutes) {
          programDurationMap.set(
            String(program.videoId),
            Math.floor(program.durationInMinutes * 60),
          );
        }
      }
    }

    return {
      videos: videos.map((v) => {
        const dto = this.toVideoListItemDto(v);
        if (!dto.durationSeconds || dto.durationSeconds <= 0) {
          dto.durationSeconds = programDurationMap.get(dto.id);
        }
        return dto;
      }),
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
      channelId: this.buildChannelIdFilter(channel),
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
      query.$or = [
        { scheduleType: 'daily' },
        { scheduleType: 'weekly', daysOfWeek: parsed.getUTCDay() },
        {
          $or: [
            { scheduleType: 'once' },
            { scheduleType: { $exists: false } },
          ],
          startTime: { $gte: startOfDay, $lte: endOfDay },
        },
      ];
    }

    const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));

    const programs = await this.programModel
      .find(query)
      .sort({ startTime: 1 })
      .limit(safeLimit);
    const defaultLiveStreamId =
      await this.resolveChannelDefaultLiveStreamId(channel);

    return programs.map((p) => this.toProgramDto(p, defaultLiveStreamId));
  }

  async getChannelLivestreamsBySlug(
    slug: string,
    limit = 20,
    status?: string,
  ): Promise<ChannelLivestreamDto[]> {
    const channel = await this.channelModel.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const validStatuses = new Set<LiveStreamStatus>([
      LiveStreamStatus.SCHEDULED,
      LiveStreamStatus.LIVE,
      LiveStreamStatus.ENDED,
      LiveStreamStatus.CANCELED,
    ]);

    const query: Record<string, unknown> = {
      channelId: this.buildChannelIdFilter(channel),
    };
    if (status && validStatuses.has(status as LiveStreamStatus)) {
      query.status = status;
    }

    const [livestreams, defaultLiveStreamId] = await Promise.all([
      this.liveStreamModel.find(query).sort({ createdAt: -1 }).limit(safeLimit),
      this.resolveChannelDefaultLiveStreamId(channel),
    ]);

    const byPriority = (value: LiveStreamDocument): number => {
      if (defaultLiveStreamId && value._id.toString() === defaultLiveStreamId) {
        return 0;
      }
      if (value.status === LiveStreamStatus.LIVE) {
        return 1;
      }
      return 2;
    };

    livestreams.sort((a, b) => {
      const p = byPriority(a) - byPriority(b);
      if (p !== 0) return p;

      const aTime =
        a.startedAt?.getTime() ||
        a.scheduledStartAt?.getTime() ||
        (a as LiveStreamDocument & { createdAt?: Date }).createdAt?.getTime() ||
        0;
      const bTime =
        b.startedAt?.getTime() ||
        b.scheduledStartAt?.getTime() ||
        (b as LiveStreamDocument & { createdAt?: Date }).createdAt?.getTime() ||
        0;
      return bTime - aTime;
    });

    return livestreams.map((livestream) =>
      this.toLivestreamDto(livestream, defaultLiveStreamId),
    );
  }
}

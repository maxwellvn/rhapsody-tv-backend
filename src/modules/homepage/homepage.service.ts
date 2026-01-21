import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
  LiveStreamScheduleType,
} from '../stream/schemas/live-stream.schema';
import { ContinueWatchingService } from '../stream/services/continue-watching.service';
import type {
  HomepageChannelDto,
  HomepageProgramDto,
  HomepageVideoDto,
  HomepageContinueWatchingDto,
  HomepageLivestreamDto,
} from './dto';

@Injectable()
export class HomepageService {
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

  private toChannelDto(channel: ChannelDocument): HomepageChannelDto {
    return {
      id: channel._id.toString(),
      name: channel.name,
      slug: channel.slug,
      logoUrl: channel.logoUrl,
      coverImageUrl: channel.coverImageUrl,
    };
  }

  private toProgramDto(program: ProgramDocument): HomepageProgramDto {
    const populatedChannel = program.populated('channelId')
      ? (program.channelId as unknown as ChannelDocument)
      : undefined;

    return {
      id: program._id.toString(),
      title: program.title,
      description: program.description,
      startTime: program.startTime?.toISOString() || new Date().toISOString(),
      endTime: program.endTime?.toISOString() || new Date().toISOString(),
      isLive: program.isLive,
      channel: populatedChannel
        ? this.toChannelDto(populatedChannel)
        : undefined,
      videoId: program.videoId?.toString(),
      liveStreamId: program.liveStreamId?.toString(),
      // Schedule fields
      scheduleType: program.scheduleType,
      startTimeOfDay: program.startTimeOfDay,
      endTimeOfDay: program.endTimeOfDay,
      daysOfWeek: program.daysOfWeek,
      durationInMinutes: program.durationInMinutes,
      timezone: program.timezone,
      thumbnailUrl: program.thumbnailUrl,
    };
  }

  toVideoDto(video: VideoDocument): HomepageVideoDto {
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

  private toLivestreamDto(livestream: LiveStreamDocument): HomepageLivestreamDto {
    const populatedChannel = livestream.populated('channelId')
      ? (livestream.channelId as unknown as ChannelDocument)
      : undefined;
    const populatedProgram = livestream.populated('programId')
      ? (livestream.programId as unknown as ProgramDocument)
      : undefined;

    return {
      id: livestream._id.toString(),
      title: livestream.title,
      description: livestream.description,
      scheduleType: livestream.scheduleType || 'continuous',
      status: livestream.status,
      scheduledStartAt: livestream.scheduledStartAt?.toISOString(),
      scheduledEndAt: livestream.scheduledEndAt?.toISOString(),
      startedAt: livestream.startedAt?.toISOString(),
      thumbnailUrl: livestream.thumbnailUrl,
      playbackUrl: livestream.playbackUrl,
      channel: populatedChannel
        ? this.toChannelDto(populatedChannel)
        : undefined,
      program: populatedProgram
        ? this.toProgramDto(populatedProgram)
        : undefined,
    };
  }

  async getLiveNow(): Promise<HomepageProgramDto | null> {
    const now = new Date();

    const liveStream = await this.liveStreamModel
      .findOne({ status: LiveStreamStatus.LIVE })
      .sort({ startedAt: -1 });

    let liveNowProgram = await this.programModel
      .findOne({
        isActive: true,
        $or: [
          { isLive: true },
          { startTime: { $lte: now }, endTime: { $gte: now } },
        ],
      })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ startTime: 1 });

    if (!liveNowProgram && liveStream) {
      liveNowProgram = await this.programModel
        .findOne({ isActive: true, liveStreamId: liveStream._id })
        .populate('channelId', 'name slug logoUrl coverImageUrl');
    }

    return liveNowProgram ? this.toProgramDto(liveNowProgram) : null;
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
    const channels = await this.channelModel
      .find({ isActive: true })
      .limit(safeLimit)
      .sort({ createdAt: -1 });
    return channels.map((c) => this.toChannelDto(c));
  }

  async getPrograms(limit = 10): Promise<HomepageProgramDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const programs = await this.programModel
      .find({ isActive: true })
      .limit(safeLimit)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ startTime: 1 });
    return programs.map((p) => this.toProgramDto(p));
  }

  async getFeaturedVideos(limit = 10): Promise<HomepageVideoDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const videos = await this.videoModel
      .find({
        isActive: true,
        visibility: VideoVisibility.PUBLIC,
      })
      .limit(safeLimit)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ publishedAt: -1, createdAt: -1 });
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

  async getLivestreams(limit = 10): Promise<HomepageLivestreamDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    
    // Get livestreams that are live or scheduled
    const livestreams = await this.liveStreamModel
      .find({
        status: { $in: [LiveStreamStatus.LIVE, LiveStreamStatus.SCHEDULED] },
      })
      .limit(safeLimit)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .populate('programId', 'title description thumbnailUrl')
      .sort({ 
        // Live streams first, then by scheduled start time
        status: 1, 
        scheduledStartAt: 1, 
        createdAt: -1 
      });
    
    return livestreams.map((l) => this.toLivestreamDto(l));
  }

  async getVideoById(videoId: string): Promise<VideoDocument | null> {
    return this.videoModel
      .findById(videoId)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .exec();
  }

  async getLivestreamById(
    livestreamId: string,
  ): Promise<HomepageProgramDto | null> {
    const livestream = await this.liveStreamModel
      .findById(livestreamId)
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .lean();

    if (!livestream) {
      return null;
    }

    const program = await this.programModel
      .findOne({
        liveStreamId: livestream._id,
        isActive: true,
      })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .lean();

    if (program) {
      return this.toProgramDto(program);
    }

    // Get channel data from the livestream
    const channel = livestream.channelId as unknown as {
      _id: Types.ObjectId;
      name: string;
      slug: string;
      logoUrl?: string;
      coverImageUrl?: string;
    };

    return {
      id: livestream._id.toString(),
      title: livestream.title,
      description: livestream.description,
      startTime:
        livestream.startedAt?.toISOString() || new Date().toISOString(),
      endTime: new Date().toISOString(),
      isLive: livestream.status === LiveStreamStatus.LIVE,
      viewerCount: (livestream as any).viewerCount || 0,
      startedAt: livestream.startedAt?.toISOString(),
      channel: channel
        ? {
            id: channel._id?.toString() || livestream.channelId?.toString(),
            name: channel.name || 'Rhapsody TV',
            slug: channel.slug || '',
            logoUrl: channel.logoUrl,
            coverImageUrl: channel.coverImageUrl,
          }
        : undefined,
      videoId: undefined,
      liveStreamId: livestream._id.toString(),
      playbackUrl: livestream.playbackUrl,
      thumbnailUrl: livestream.thumbnailUrl,
    };
  }
}

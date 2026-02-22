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
  SearchChannelResultDto,
  SearchProgramResultDto,
  UnifiedSearchResultsDto,
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
      thumbnailUrl: program.thumbnailUrl,
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
      displayOrder: 1,
      createdAt: -1,
    });

    // Split into channels with explicit displayOrder and those without
    const ordered = channels.filter((c) => c.displayOrder != null);
    const unordered = channels.filter((c) => c.displayOrder == null);

    const defaultLiveStreamIds = unordered
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

    // Unordered channels keep existing priority logic
    const sortedUnordered = [...unordered].sort((a, b) => {
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

    // Ordered channels first (already sorted by displayOrder from DB), then unordered
    const combined = [...ordered, ...sortedUnordered];

    return combined.slice(0, safeLimit).map((c) => this.toChannelDto(c));
  }

  async getPrograms(limit = 10): Promise<HomepageProgramDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const programs = await this.programModel
      .find({ isActive: true })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ isLive: -1, createdAt: -1, startTime: 1 })
      .limit(safeLimit);

    const programIds = programs.map((p) => p._id);
    const videoCounts = await this.videoModel.aggregate([
      {
        $match: {
          programId: { $in: programIds },
          visibility: VideoVisibility.PUBLIC,
        },
      },
      { $group: { _id: '$programId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(
      videoCounts.map((v) => [v._id.toString(), v.count]),
    );

    return programs.map((p) => ({
      ...this.toProgramDto(p),
      videoCount: countMap.get(p._id.toString()) ?? 0,
    }));
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

  // ─── Unified Semantic Search ──────────────────────────────────────────────

  private readonly searchSynonyms: Record<string, string[]> = {
    live: ['stream', 'broadcast', 'now', 'realtime'],
    stream: ['live', 'broadcast'],
    worship: ['praise', 'church', 'service', 'sermon'],
    sermon: ['message', 'teaching', 'preaching', 'worship'],
    music: ['song', 'audio', 'concert', 'worship'],
    prayer: ['devotion', 'intercession', 'worship'],
    motivation: ['inspiration', 'encouragement'],
    podcast: ['talk', 'discussion', 'conversation'],
  };

  private searchTokenize(text?: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
  }

  private searchNormalize(text?: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private searchBuildTerms(query: string): string[] {
    const terms = new Set<string>();
    const tokens = this.searchTokenize(query);
    for (const token of tokens) {
      terms.add(token);
      (this.searchSynonyms[token] ?? []).forEach((s) => terms.add(s));
    }
    if (query.trim()) terms.add(this.searchNormalize(query));
    return Array.from(terms);
  }

  private searchDice(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const bigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i++) {
      const bg = a.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }
    let overlap = 0;
    for (let i = 0; i < b.length - 1; i++) {
      const bg = b.slice(i, i + 2);
      const count = bigrams.get(bg) ?? 0;
      if (count > 0) { overlap++; bigrams.set(bg, count - 1); }
    }
    return (2 * overlap) / (a.length + b.length - 2);
  }

  private scoreVideo(video: VideoDocument & { channelId?: { name?: string } }, query: string): number {
    const q = this.searchNormalize(query);
    if (!q) return 0;
    const title = this.searchNormalize(video.title);
    const desc = this.searchNormalize(video.description);
    const channel = this.searchNormalize((video.channelId as any)?.name);
    const hay = `${title} ${desc} ${channel}`.trim();
    const tokens = this.searchTokenize(q);
    const terms = this.searchBuildTerms(q);
    let score = 0;
    if (title.includes(q)) score += 130;
    if (desc.includes(q)) score += 90;
    if (hay.includes(q)) score += 70;
    for (const t of tokens) {
      if (title.includes(t)) score += 35;
      else if (hay.includes(t)) score += 20;
    }
    for (const t of terms) {
      if (t.length < 3) continue;
      if (title.includes(t)) score += 16;
      else if (hay.includes(t)) score += 8;
    }
    score += this.searchDice(q, title) * 90;
    score += this.searchDice(q, hay) * 45;
    score += Math.log1p((video as any).viewCount ?? 0) * 2;
    score += Math.log1p((video as any).likeCount ?? 0) * 2;
    return score;
  }

  private scoreChannel(channel: ChannelDocument, query: string): number {
    const q = this.searchNormalize(query);
    if (!q) return 0;
    const name = this.searchNormalize(channel.name);
    const slug = this.searchNormalize(channel.slug);
    const desc = this.searchNormalize(channel.description);
    const hay = `${name} ${slug} ${desc}`.trim();
    const tokens = this.searchTokenize(q);
    const terms = this.searchBuildTerms(q);
    let score = 0;
    if (name.includes(q)) score += 130;
    if (slug.includes(q)) score += 80;
    if (desc.includes(q)) score += 60;
    for (const t of tokens) {
      if (name.includes(t)) score += 40;
      else if (hay.includes(t)) score += 20;
    }
    for (const t of terms) {
      if (t.length < 3) continue;
      if (name.includes(t)) score += 18;
      else if (hay.includes(t)) score += 8;
    }
    score += this.searchDice(q, name) * 90;
    score += this.searchDice(q, hay) * 40;
    score += Math.log1p(channel.subscriberCount ?? 0) * 2;
    return score;
  }

  private scoreProgram(program: ProgramDocument & { channelId?: { name?: string } }, query: string): number {
    const q = this.searchNormalize(query);
    if (!q) return 0;
    const title = this.searchNormalize(program.title);
    const desc = this.searchNormalize(program.description);
    const channelName = this.searchNormalize((program.channelId as any)?.name);
    const hay = `${title} ${desc} ${channelName}`.trim();
    const tokens = this.searchTokenize(q);
    const terms = this.searchBuildTerms(q);
    let score = 0;
    if (title.includes(q)) score += 130;
    if (desc.includes(q)) score += 80;
    if (channelName.includes(q)) score += 50;
    for (const t of tokens) {
      if (title.includes(t)) score += 40;
      else if (hay.includes(t)) score += 20;
    }
    for (const t of terms) {
      if (t.length < 3) continue;
      if (title.includes(t)) score += 18;
      else if (hay.includes(t)) score += 8;
    }
    score += this.searchDice(q, title) * 90;
    score += this.searchDice(q, hay) * 40;
    if ((program as any).isLive) score += 20;
    return score;
  }

  async search(query: string, limit = 5): Promise<UnifiedSearchResultsDto> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const q = query.trim();

    if (!q) {
      return { videos: [], channels: [], programs: [], totals: { videos: 0, channels: 0, programs: 0 } };
    }

    const terms = this.searchBuildTerms(q).slice(0, 10);
    const termRegexes = terms
      .filter((t) => t.length >= 2)
      .map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    const videoFilter = termRegexes.length
      ? { isActive: true, visibility: VideoVisibility.PUBLIC, $or: termRegexes.flatMap((r) => [{ title: r }, { description: r }]) }
      : { isActive: true, visibility: VideoVisibility.PUBLIC };

    const channelFilter = termRegexes.length
      ? { isActive: true, $or: termRegexes.flatMap((r) => [{ name: r }, { slug: r }, { description: r }]) }
      : { isActive: true };

    const programFilter = termRegexes.length
      ? { isActive: true, $or: termRegexes.flatMap((r) => [{ title: r }, { description: r }]) }
      : { isActive: true };

    const [rawVideos, rawChannels, rawPrograms] = await Promise.all([
      this.videoModel
        .find(videoFilter)
        .limit(300)
        .populate('channelId', 'name slug logoUrl coverImageUrl')
        .sort({ publishedAt: -1, createdAt: -1 })
        .exec(),
      this.channelModel
        .find(channelFilter)
        .limit(100)
        .sort({ subscriberCount: -1, createdAt: -1 })
        .exec(),
      this.programModel
        .find(programFilter)
        .limit(200)
        .populate('channelId', 'name slug logoUrl coverImageUrl')
        .sort({ isLive: -1, startTime: 1 })
        .exec(),
    ]);

    const scoredVideos = rawVideos
      .map((v) => ({ v, score: this.scoreVideo(v as any, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const scoredChannels = rawChannels
      .map((c) => ({ c, score: this.scoreChannel(c, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const scoredPrograms = rawPrograms
      .map((p) => ({ p, score: this.scoreProgram(p as any, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    const videos = scoredVideos.slice(0, safeLimit).map(({ v }) => this.toVideoDto(v));

    const channels: SearchChannelResultDto[] = scoredChannels.slice(0, safeLimit).map(({ c }) => ({
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      description: c.description,
      logoUrl: c.logoUrl,
      coverImageUrl: c.coverImageUrl,
      defaultLiveStreamId: c.defaultLiveStreamId?.toString(),
      subscriberCount: c.subscriberCount ?? 0,
    }));

    const programs: SearchProgramResultDto[] = scoredPrograms.slice(0, safeLimit).map(({ p }) => {
      const ch = this.resolvePopulatedChannel((p as any).channelId);
      return {
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        scheduleType: p.scheduleType,
        startTime: p.startTime.toISOString(),
        endTime: p.endTime.toISOString(),
        isLive: !!(p as any).isLive,
        thumbnailUrl: (p as any).thumbnailUrl,
        channel: ch ? this.toChannelDto(ch) : undefined,
      };
    });

    return {
      videos,
      channels,
      programs,
      totals: {
        videos: scoredVideos.length,
        channels: scoredChannels.length,
        programs: scoredPrograms.length,
      },
    };
  }
}

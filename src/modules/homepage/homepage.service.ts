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
  private readonly ROR_TIMEZONE = 'Africa/Lagos'; // WAT (UTC+1)

  // ─── RoR Devotional Token Cache ────────────────────────────────────────────
  private rorToken: string | null = null;
  private rorTokenTs = 0;
  private readonly ROR_BASE = 'https://read.rhapsodyofrealities.org';
  private readonly ROR_TOKEN_LIFETIME = 40 * 60 * 1000; // 40 min

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

  private getRorNowParts(date = new Date()): {
    year: number;
    month: number; // 1-12
    day: number; // 1-31
  } {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: this.ROR_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const get = (type: 'year' | 'month' | 'day') =>
      Number(parts.find((p) => p.type === type)?.value ?? 0);

    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
    };
  }

  private parseYmdParts(
    value?: string,
  ): { year: number; month: number; day: number } | null {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [ys, ms, ds] = value.split('-');
    const year = Number(ys);
    const month = Number(ms);
    const day = Number(ds);
    if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;

    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() + 1 !== month ||
      check.getUTCDate() !== day
    ) {
      return null;
    }

    return { year, month, day };
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

  private resolvePopulatedProgram(
    value: unknown,
  ): (ProgramDocument & { title: string }) | undefined {
    return value && typeof value === 'object' && 'title' in value
      ? (value as ProgramDocument & { title: string })
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
    const now = new Date();

    return {
      id: program._id.toString(),
      title: program.title,
      description: program.description,
      startTime: now.toISOString(),
      endTime: now.toISOString(),
      isLive: program.isLive,
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
    const programValue = (video as unknown as { programId?: unknown })
      .programId;
    const populatedChannel =
      channelValue && typeof channelValue === 'object' && 'name' in channelValue
        ? (channelValue as ChannelDocument)
        : undefined;
    const populatedProgram = this.resolvePopulatedProgram(programValue);

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
      program: populatedProgram
        ? {
            id: populatedProgram._id.toString(),
            title: populatedProgram.title,
          }
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
      .populate('programId', 'title')
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

    const combined = [...ordered, ...sortedUnordered];

    return combined.slice(0, safeLimit).map((c) => this.toChannelDto(c));
  }

  async getPrograms(limit = 10): Promise<HomepageProgramDto[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const programs = await this.programModel
      .find({ isActive: true })
      .populate('channelId', 'name slug logoUrl coverImageUrl')
      .sort({ isLive: -1, createdAt: -1 })
      .limit(safeLimit);

    // Build ID candidates matching both string and ObjectId forms
    const programIdCandidates = programs.flatMap((p) => {
      const id = p._id;
      const candidates: Array<string | Types.ObjectId> = [];
      if (id instanceof Types.ObjectId) candidates.push(id);
      const strId = String(id);
      candidates.push(strId);
      if (
        typeof strId === 'string' &&
        strId.length === 24 &&
        /^[0-9a-fA-F]{24}$/.test(strId)
      ) {
        const objId = new Types.ObjectId(strId);
        if (!candidates.some((c) => c instanceof Types.ObjectId && c.equals(objId))) {
          candidates.push(objId);
        }
      }
      return candidates;
    });

    // Count videos linked via video.programId
    const videoCounts = await this.videoModel.aggregate([
      {
        $match: {
          programId: { $in: programIdCandidates },
          visibility: VideoVisibility.PUBLIC,
        },
      },
      { $group: { _id: '$programId', count: { $sum: 1 } } },
    ]);
    const countMap = new Map<string, number>(
      videoCounts.map((v) => [v._id.toString(), v.count]),
    );

    const programsWithDirectVideo = programs.filter(
      (p) => p.videoId && !countMap.has(p._id.toString()),
    );

    if (programsWithDirectVideo.length > 0) {
      const directVideoIds = programsWithDirectVideo
        .map((p) => p.videoId)
        .filter((id): id is Types.ObjectId => !!id);
      const existingVideos = await this.videoModel
        .find({
          _id: { $in: directVideoIds },
          visibility: VideoVisibility.PUBLIC,
        })
        .select('_id')
        .lean();

      const existingVideoIdSet = new Set(
        existingVideos.map((v) => v._id.toString()),
      );

      for (const program of programsWithDirectVideo) {
        if (
          program.videoId &&
          existingVideoIdSet.has(program.videoId.toString())
        ) {
          countMap.set(program._id.toString(), 1);
        }
      }
    }

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
      .populate('programId', 'title')
      .sort({ featuredOrder: 1, publishedAt: -1, createdAt: -1 });

    const missingProgramVideoIds = videos
      .filter((video) => !(video as unknown as { programId?: unknown }).programId)
      .map((video) => video._id);

    const reverseProgramMap = new Map<string, { id: string; title: string }>();

    if (missingProgramVideoIds.length > 0) {
      const linkedPrograms = await this.programModel
        .find({
          isActive: true,
          videoId: { $in: missingProgramVideoIds },
        })
        .select('_id title videoId')
        .lean();

      for (const program of linkedPrograms) {
        const videoId = (program as { videoId?: Types.ObjectId | string }).videoId;
        if (!videoId) continue;
        reverseProgramMap.set(String(videoId), {
          id: String((program as { _id: Types.ObjectId | string })._id),
          title: String((program as { title?: string }).title ?? ''),
        });
      }
    }

    return videos.map((v) => {
      const dto = this.toVideoDto(v);
      if (!dto.program) {
        const reverseProgram = reverseProgramMap.get(v._id.toString());
        if (reverseProgram?.title) {
          dto.program = reverseProgram;
        }
      }
      return dto;
    });
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
      .populate('programId', 'title')
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
        .sort({ isLive: -1, createdAt: -1 })
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

    const now = new Date();
    const programs: SearchProgramResultDto[] = scoredPrograms.slice(0, safeLimit).map(({ p }) => {
      const ch = this.resolvePopulatedChannel((p as any).channelId);
      const createdAt = (p as any).createdAt;
      return {
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        startTime: createdAt ? this.toIsoStringSafe(createdAt) : now.toISOString(),
        endTime: createdAt ? this.toIsoStringSafe(createdAt) : now.toISOString(),
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

  // ─── RoR Daily Devotional Proxy ──────────────────────────────────────────

  private async getRorToken(): Promise<string | null> {
    if (this.rorToken && Date.now() - this.rorTokenTs < this.ROR_TOKEN_LIFETIME) {
      return this.rorToken;
    }
    try {
      const resp = await fetch(`${this.ROR_BASE}/`);
      const setCookie = resp.headers.get('set-cookie') ?? '';
      const match = setCookie.match(/_read_IPA=([^;]+)/);
      if (match) {
        this.rorToken = match[1];
        this.rorTokenTs = Date.now();
        return this.rorToken;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getDailyDevotional(dateOverride?: string): Promise<Record<string, unknown> | null> {
    try {
      const token = await this.getRorToken();
      if (!token) return null;

      const now = new Date();
      const selectedDate = this.parseYmdParts(dateOverride) ?? this.getRorNowParts(now);
      const y = selectedDate.year;
      const m = String(selectedDate.month).padStart(2, '0');
      const d = String(selectedDate.day).padStart(2, '0');
      const date = `${y}-${m}-${d}`;

      const months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
      ];
      const audioUrl = `https://roraudio.b-cdn.net/${y}/${months[selectedDate.month - 1]}/${selectedDate.day}.mp3`;

      const resp = await fetch(`${this.ROR_BASE}/api/daily-devotional/${date}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Referer: `${this.ROR_BASE}/`,
        },
      });

      const data = await resp.json() as { result?: Record<string, unknown>[] };
      const devotional = data?.result?.[0];
      if (!devotional) return null;

      const body = typeof devotional.body === 'string' ? devotional.body : '';
      const plainBody = body.replace(/<[^>]+>/g, '').trim();

      return { ...devotional, audioUrl, plainBody };
    } catch {
      return null;
    }
  }
}

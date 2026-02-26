import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Video,
  VideoDocument,
  VideoVisibility,
} from '../stream/schemas/video.schema';
import { SearchVideosQueryDto } from './dto';

type SearchVideoDocument = VideoDocument & {
  channelId?: {
    _id?: { toString(): string };
    name?: string;
    logoUrl?: string;
  } | null;
  programId?: {
    _id?: { toString(): string };
    title?: string;
  } | { toString(): string } | null;
  createdAt?: Date;
  publishedAt?: Date;
};

@Injectable()
export class VideosService {
  constructor(
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
  ) {}

  private readonly semanticSynonyms: Record<string, string[]> = {
    live: ['stream', 'broadcast', 'now', 'realtime'],
    stream: ['live', 'broadcast'],
    worship: ['praise', 'church', 'service', 'sermon'],
    sermon: ['message', 'teaching', 'preaching', 'worship'],
    music: ['song', 'audio', 'concert', 'worship'],
    prayer: ['devotion', 'intercession', 'worship'],
    motivation: ['inspiration', 'encouragement'],
    podcast: ['talk', 'discussion', 'conversation'],
  };

  private tokenize(text?: string): string[] {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 2);
  }

  private normalize(text?: string): string {
    if (!text) return '';
    return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private buildSemanticTerms(query: string): string[] {
    const terms = new Set<string>();
    const tokens = this.tokenize(query);

    for (const token of tokens) {
      terms.add(token);
      const synonyms = this.semanticSynonyms[token] ?? [];
      synonyms.forEach((synonym) => terms.add(synonym));
    }

    if (query.trim().length > 0) {
      terms.add(this.normalize(query));
    }

    return Array.from(terms);
  }

  private uniqueTokens(text?: string): string[] {
    return Array.from(new Set(this.tokenize(text)));
  }

  private jaccardSimilarity(aTokens: string[], bTokens: string[]): number {
    if (aTokens.length === 0 || bTokens.length === 0) return 0;
    const a = new Set(aTokens);
    const b = new Set(bTokens);
    let intersection = 0;
    a.forEach((token) => {
      if (b.has(token)) intersection += 1;
    });
    const union = a.size + b.size - intersection;
    return union > 0 ? intersection / union : 0;
  }

  private getVideoText(video: SearchVideoDocument): string {
    const programTitle =
      video.programId && typeof video.programId === 'object' && 'title' in video.programId
        ? (video.programId.title ?? '')
        : '';
    return [video.title, video.description, video.channelId?.name, programTitle]
      .filter(Boolean)
      .join(' ');
  }

  private getEntityId(value: unknown): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value !== null) {
      const obj = value as { _id?: { toString(): string }; toString?: () => string };
      if (obj._id?.toString) return obj._id.toString();
      if (obj.toString) {
        const text = obj.toString();
        if (text && text !== '[object Object]') return text;
      }
    }
    return undefined;
  }

  private diceCoefficient(a: string, b: string): number {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const bigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i += 1) {
      const bg = a.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) ?? 0) + 1);
    }

    let overlap = 0;
    for (let i = 0; i < b.length - 1; i += 1) {
      const bg = b.slice(i, i + 2);
      const count = bigrams.get(bg) ?? 0;
      if (count > 0) {
        overlap += 1;
        bigrams.set(bg, count - 1);
      }
    }

    return (2 * overlap) / (a.length + b.length - 2);
  }

  private computeSemanticScore(video: SearchVideoDocument, query: string): number {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return 0;

    const title = this.normalize(video.title);
    const description = this.normalize(video.description);
    const channelName = this.normalize(video.channelId?.name);
    const haystack = `${title} ${description} ${channelName}`.trim();

    const queryTokens = this.tokenize(normalizedQuery);
    const semanticTerms = this.buildSemanticTerms(normalizedQuery);

    let score = 0;

    if (title.includes(normalizedQuery)) score += 130;
    if (description.includes(normalizedQuery)) score += 90;
    if (haystack.includes(normalizedQuery)) score += 70;

    for (const token of queryTokens) {
      if (title.includes(token)) score += 35;
      else if (haystack.includes(token)) score += 20;
    }

    for (const term of semanticTerms) {
      if (term.length < 3) continue;
      if (title.includes(term)) score += 16;
      else if (haystack.includes(term)) score += 8;
    }

    score += this.diceCoefficient(normalizedQuery, title) * 90;
    score += this.diceCoefficient(normalizedQuery, haystack) * 45;

    score += Math.log1p(video.viewCount ?? 0) * 2;
    score += Math.log1p(video.likeCount ?? 0) * 2;

    const freshnessDate = video.publishedAt ?? video.createdAt;
    if (freshnessDate) {
      const ageDays = Math.max(
        0,
        (Date.now() - new Date(freshnessDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      score += Math.max(0, 20 - ageDays / 10);
    }

    return score;
  }

  private computeRelatedScore(
    source: SearchVideoDocument,
    candidate: SearchVideoDocument,
  ): number {
    const sourceTitle = this.normalize(source.title);
    const sourceText = this.normalize(this.getVideoText(source));
    const candidateTitle = this.normalize(candidate.title);
    const candidateText = this.normalize(this.getVideoText(candidate));

    const sourceTitleTokens = this.uniqueTokens(sourceTitle);
    const sourceTextTokens = this.uniqueTokens(sourceText);
    const candidateTitleTokens = this.uniqueTokens(candidateTitle);
    const candidateTextTokens = this.uniqueTokens(candidateText);

    const titleOverlap = this.jaccardSimilarity(sourceTitleTokens, candidateTitleTokens);
    const textOverlap = this.jaccardSimilarity(sourceTextTokens, candidateTextTokens);

    const sourceQuery = [
      source.title,
      typeof source.programId === 'object' && source.programId && 'title' in source.programId
        ? source.programId.title
        : '',
      source.channelId?.name,
    ]
      .filter(Boolean)
      .join(' ');

    let score = 0;
    score += this.computeSemanticScore(candidate, sourceQuery) * 0.75;
    score += titleOverlap * 160;
    score += textOverlap * 120;
    score += this.diceCoefficient(sourceTitle, candidateTitle) * 90;
    score += this.diceCoefficient(sourceText, candidateText) * 60;

    const sourceProgramId = this.getEntityId(source.programId);
    const candidateProgramId = this.getEntityId(candidate.programId);
    const sourceChannelId = this.getEntityId(source.channelId?._id ?? source.channelId);
    const candidateChannelId = this.getEntityId(candidate.channelId?._id ?? candidate.channelId);

    if (sourceProgramId && candidateProgramId && sourceProgramId === candidateProgramId) {
      score += 180;
    }
    if (sourceChannelId && candidateChannelId && sourceChannelId === candidateChannelId) {
      score += 70;
    }

    return score;
  }

  private pairwiseSemanticSimilarity(
    a: SearchVideoDocument,
    b: SearchVideoDocument,
  ): number {
    const aText = this.normalize(this.getVideoText(a));
    const bText = this.normalize(this.getVideoText(b));
    const jaccard = this.jaccardSimilarity(this.uniqueTokens(aText), this.uniqueTokens(bText));
    const dice = this.diceCoefficient(aText, bText);
    return Math.max(0, Math.min(1, jaccard * 0.6 + dice * 0.4));
  }

  private mmrDiversify(
    ranked: { video: SearchVideoDocument; score: number }[],
    lambda = 0.78,
  ): { video: SearchVideoDocument; score: number }[] {
    if (ranked.length <= 2) return ranked;

    const remaining = [...ranked];
    const selected: { video: SearchVideoDocument; score: number }[] = [];

    while (remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = Number.NEGATIVE_INFINITY;

      for (let i = 0; i < remaining.length; i += 1) {
        const candidate = remaining[i];
        const redundancy =
          selected.length === 0
            ? 0
            : Math.max(
                ...selected.map((picked) =>
                  this.pairwiseSemanticSimilarity(candidate.video, picked.video),
                ),
              );

        const mmrScore = lambda * candidate.score - (1 - lambda) * redundancy * 100;
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      selected.push(remaining.splice(bestIndex, 1)[0]);
    }

    return selected;
  }

  private mapVideo(video: SearchVideoDocument) {
    const channel = video.channelId ?? undefined;

    return {
      id: video._id.toString(),
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnailUrl,
      streamUrl: video.playbackUrl,
      duration: video.durationSeconds,
      views: video.viewCount ?? 0,
      likes: video.likeCount ?? 0,
      dislikes: 0,
      isLiked: false,
      isDisliked: false,
      uploadDate: (video.publishedAt ?? video.createdAt)?.toISOString(),
      category: 'general',
      tags: [],
      channel: {
        id: channel?._id?.toString() ?? '',
        name: channel?.name ?? 'Unknown Channel',
        avatar: channel?.logoUrl,
        isSubscribed: false,
      },
    };
  }

  private paginated<T>(items: T[], total: number, page: number, limit: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async list(query: SearchVideosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return this.paginated(
      videos.map((video) => this.mapVideo(video as unknown as SearchVideoDocument)),
      total,
      page,
      limit,
    );
  }

  async search(query: SearchVideosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const rawSearch = query.search?.trim() ?? '';

    const baseFilter = {
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    if (!rawSearch) {
      return this.list(query);
    }

    const semanticTerms = this.buildSemanticTerms(rawSearch).slice(0, 10);
    const termRegexes = semanticTerms
      .filter((term) => term.length >= 2)
      .map((term) => new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));

    const textFilter = {
      ...baseFilter,
      $or: termRegexes.flatMap((regex) => [
        { title: regex },
        { description: regex },
      ]),
    } as const;

    let candidates = (await this.videoModel
      .find(textFilter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(400)
      .populate('channelId', 'name logoUrl')
      .exec()) as unknown as SearchVideoDocument[];

    // Fallback to broader candidate pool when regex pre-filter is too strict.
    if (candidates.length < 40) {
      const fallback = (await this.videoModel
        .find(baseFilter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(400)
        .populate('channelId', 'name logoUrl')
        .exec()) as unknown as SearchVideoDocument[];

      const seen = new Set(candidates.map((video) => video._id.toString()));
      fallback.forEach((video) => {
        const id = video._id.toString();
        if (!seen.has(id)) {
          candidates.push(video);
          seen.add(id);
        }
      });
    }

    const ranked = candidates
      .map((video) => ({
        video,
        score: this.computeSemanticScore(video, rawSearch),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(skip, skip + limit);

    const total = candidates.reduce((count, video) => {
      const score = this.computeSemanticScore(video, rawSearch);
      return score > 0 ? count + 1 : count;
    }, 0);

    return this.paginated(
      ranked.map((entry) => this.mapVideo(entry.video)),
      total,
      page,
      limit,
    );
  }

  async trending(query: SearchVideosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ viewCount: -1, likeCount: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return this.paginated(
      videos.map((video) => this.mapVideo(video as unknown as SearchVideoDocument)),
      total,
      page,
      limit,
    );
  }

  async recommended(query: SearchVideosQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter = {
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ isFeatured: -1, featuredOrder: 1, likeCount: -1, publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return this.paginated(
      videos.map((video) => this.mapVideo(video as unknown as SearchVideoDocument)),
      total,
      page,
      limit,
    );
  }

  async details(videoId: string) {
    const video = (await this.videoModel
      .findOne({
        _id: videoId,
        isActive: true,
        visibility: VideoVisibility.PUBLIC,
      })
      .populate('channelId', 'name logoUrl')
      .exec()) as unknown as SearchVideoDocument | null;

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return this.mapVideo(video);
  }

  async related(videoId: string, query: SearchVideosQueryDto) {
    const source = await this.videoModel
      .findById(videoId)
      .select('_id channelId programId')
      .exec();
    if (!source) {
      throw new NotFoundException('Video not found');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      _id: { $ne: source._id },
      isActive: true,
      visibility: VideoVisibility.PUBLIC,
    };

    const relatedClauses: Record<string, unknown>[] = [];
    if (source.channelId) relatedClauses.push({ channelId: source.channelId });
    if (source.programId) relatedClauses.push({ programId: source.programId });
    if (relatedClauses.length > 0) {
      filter.$or = relatedClauses;
    }

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .sort({ publishedAt: -1, createdAt: -1, viewCount: -1 })
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name logoUrl')
        .exec(),
      this.videoModel.countDocuments(filter),
    ]);

    return this.paginated(
      videos.map((video) => this.mapVideo(video as unknown as SearchVideoDocument)),
      total,
      page,
      limit,
    );
  }
}

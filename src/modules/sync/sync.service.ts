import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, AnyBulkWriteOperation } from 'mongoose';
import { Channel, ChannelDocument } from '../channel/schemas/channel.schema';
import {
  Program,
  ProgramDocument,
  AnnouncementType,
} from '../channel/schemas/program.schema';
import { Video, VideoDocument } from '../stream/schemas/video.schema';
import {
  Schedule,
  ScheduleDocument,
  ScheduleTargetType,
  ScheduleType,
} from '../channel/schemas/schedule.schema';
import { RtvApiService } from './rtv-api.service';
import {
  ScheduleParserService,
  ParsedScheduleEntry,
} from './schedule-parser.service';
import {
  ContentSyncResultDto,
  ScheduleSyncResultDto,
  SyncStatusDto,
} from './dto/sync-result.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  // In-memory sync state
  private syncState: SyncStatusDto = { state: 'idle' };

  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
    @InjectModel(Video.name)
    private readonly videoModel: Model<VideoDocument>,
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    private readonly rtvApi: RtvApiService,
    private readonly scheduleParser: ScheduleParserService,
  ) {}

  getStatus(): SyncStatusDto {
    return { ...this.syncState };
  }

  private normalizeScheduleNameKey(name: string): string {
    return name.trim().toLowerCase();
  }

  private dedupeScheduleEntries(
    entries: ParsedScheduleEntry[],
  ): ParsedScheduleEntry[] {
    const byKey = new Map<
      string,
      {
        programName: string;
        startTime: string;
        endTime: string;
        days: Set<number>;
      }
    >();

    for (const entry of entries) {
      const programName = entry.programName?.trim();
      if (!programName) continue;

      const key = [
        this.normalizeScheduleNameKey(programName),
        entry.startTime || '',
        entry.endTime || '',
      ].join('|');

      const existing = byKey.get(key);
      if (existing) {
        for (const day of entry.days || []) {
          existing.days.add(day);
        }
        continue;
      }

      byKey.set(key, {
        programName,
        startTime: entry.startTime,
        endTime: entry.endTime,
        days: new Set(entry.days || []),
      });
    }

    return Array.from(byKey.values()).map((item) => ({
      programName: item.programName,
      startTime: item.startTime,
      endTime: item.endTime,
      days: Array.from(item.days).sort((a, b) => a - b),
    }));
  }

  private normalizeScheduleTitleKey(value?: string | null): string {
    return (value || '').trim().toLowerCase();
  }

  private normalizeDays(days?: number[] | null): number[] {
    return [...new Set((days || []).filter((d) => Number.isInteger(d)))].sort(
      (a, b) => a - b,
    );
  }

  private buildScheduleTimingKey(schedule: ScheduleDocument): string {
    if (schedule.scheduleType === ScheduleType.ONCE) {
      return [
        'once',
        schedule.startTime ? new Date(schedule.startTime).toISOString() : '',
        schedule.endTime ? new Date(schedule.endTime).toISOString() : '',
      ].join('|');
    }

    if (schedule.scheduleType === ScheduleType.DAILY) {
      return [
        'daily',
        schedule.startTimeOfDay || '',
        schedule.endTimeOfDay || '',
      ].join('|');
    }

    return [
      'weekly',
      schedule.startTimeOfDay || '',
      schedule.endTimeOfDay || '',
      this.normalizeDays(schedule.daysOfWeek).join(','),
    ].join('|');
  }

  private async cleanupDuplicateSchedulesForChannel(
    channelId: Types.ObjectId,
  ): Promise<number> {
    const [channel, programs] = await Promise.all([
      this.channelModel.findById(channelId).select('_id name').lean(),
      this.programModel.find({ channelId }).select('_id title').lean(),
    ]);

    const programTitleById = new Map<string, string>();
    for (const program of programs) {
      programTitleById.set(
        String(program._id),
        this.normalizeScheduleTitleKey(program.title),
      );
    }

    const channelNameKey = this.normalizeScheduleTitleKey(channel?.name);
    const programIds = programs.map((p) => p._id);
    const schedules = await this.scheduleModel
      .find({
        $or: [
          {
            targetType: ScheduleTargetType.CHANNEL,
            targetId: channelId,
          },
          {
            targetType: ScheduleTargetType.PROGRAM,
            targetId: { $in: programIds },
          },
        ],
      })
      .sort({ createdAt: 1, _id: 1 });

    const groups = new Map<string, ScheduleDocument[]>();

    for (const schedule of schedules) {
      const targetNameKey =
        schedule.targetType === ScheduleTargetType.PROGRAM
          ? (programTitleById.get(String(schedule.targetId)) || '')
          : channelNameKey;
      const titleKey = this.normalizeScheduleTitleKey(schedule.title);
      const nameKey = titleKey || targetNameKey || '';
      const key = [
        schedule.targetType,
        nameKey,
        this.buildScheduleTimingKey(schedule),
      ].join('|');

      const existing = groups.get(key);
      if (existing) {
        existing.push(schedule);
      } else {
        groups.set(key, [schedule]);
      }
    }

    let removedCount = 0;

    for (const duplicates of groups.values()) {
      if (duplicates.length < 2) continue;

      const [keep, ...rest] = duplicates;

      if (keep.scheduleType === ScheduleType.WEEKLY) {
        const mergedDays = this.normalizeDays([
          ...(keep.daysOfWeek || []),
          ...rest.flatMap((s) => s.daysOfWeek || []),
        ]);
        const keepDays = this.normalizeDays(keep.daysOfWeek);
        if (JSON.stringify(mergedDays) !== JSON.stringify(keepDays)) {
          await this.scheduleModel.updateOne(
            { _id: keep._id },
            { $set: { daysOfWeek: mergedDays } },
          );
        }
      }

      const duplicateIds = rest.map((s) => s._id);
      if (duplicateIds.length > 0) {
        const deleteResult = await this.scheduleModel.deleteMany({
          _id: { $in: duplicateIds },
        });
        removedCount += deleteResult.deletedCount ?? duplicateIds.length;
      }
    }

    return removedCount;
  }

  async syncContent(): Promise<ContentSyncResultDto> {
    if (
      this.syncState.state === 'syncing-content' ||
      this.syncState.state === 'syncing-schedule'
    ) {
      throw new ConflictException('A sync operation is already in progress');
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let programsCreated = 0;
    let programsSkipped = 0;
    let videosCreated = 0;
    let videosSkipped = 0;
    let videoUrlsResolved = 0;

    try {
      this.syncState = {
        state: 'syncing-content',
        progress: { current: 0, total: 0, phase: 'Finding channel...' },
      };

      // Step 1: Find Rhapsody TV channel
      const channel = await this.channelModel.findOne({ slug: 'rhapsody-tv' });
      if (!channel) {
        throw new NotFoundException(
          'Channel "rhapsody-tv" not found. Create it first.',
        );
      }
      const channelId = channel._id as Types.ObjectId;

      // Step 2: Fetch all categories
      this.syncState.progress = {
        current: 0,
        total: 7,
        phase: 'Fetching categories...',
      };
      const categories = await this.rtvApi.fetchAllCategories();
      this.logger.log(`Fetched ${categories.length} categories`);

      // Step 3: Upsert programs from categories
      this.syncState.progress = {
        current: 0,
        total: categories.length,
        phase: 'Syncing programs...',
      };

      if (categories.length > 0) {
        const programOps: AnyBulkWriteOperation<any>[] = categories.map(
          (cat) => ({
            updateOne: {
              filter: { externalId: cat.category_id },
              update: {
                $setOnInsert: {
                  channelId,
                  title: cat.category_name
                    .replace(/-/g, ' ')
                    .replace(
                      /\w\S*/g,
                      (txt: string) =>
                        txt.charAt(0).toUpperCase() +
                        txt.substring(1).toLowerCase(),
                    ),
                  thumbnailUrl: cat.category_image_link,
                  announcementType: AnnouncementType.SHOW,
                  category: 'RTV',
                  isActive: true,
                },
                $set: { externalId: cat.category_id },
              },
              upsert: true,
            },
          }),
        );

        const programResult = await this.programModel.bulkWrite(programOps);
        programsCreated = programResult.upsertedCount;
        programsSkipped = categories.length - programResult.upsertedCount;
        this.logger.log(
          `Programs: ${programsCreated} created, ${programsSkipped} skipped`,
        );
      }

      // Build externalId -> Program ObjectId map
      const programs = await this.programModel.find({
        externalId: { $in: categories.map((c) => c.category_id) },
      });
      const programMap = new Map<string, Types.ObjectId>();
      for (const p of programs) {
        if (p.externalId) {
          programMap.set(p.externalId, p._id as Types.ObjectId);
        }
      }

      // Step 4: Fetch and upsert videos for each category
      const totalCategories = categories.length;
      for (let i = 0; i < totalCategories; i++) {
        const cat = categories[i];
        this.syncState.progress = {
          current: i + 1,
          total: totalCategories,
          phase: `Fetching videos: ${cat.category_name}`,
        };

        try {
          const videos = await this.rtvApi.fetchVideosForCategory(
            cat.category_name,
          );
          if (videos.length === 0) continue;

          const programId = programMap.get(cat.category_id);

          const videoOps: AnyBulkWriteOperation<any>[] = videos.map((v) => ({
            updateOne: {
              filter: { externalId: v.video_id },
              update: {
                $setOnInsert: {
                  channelId,
                  programId,
                  title: v.video_title.replace(/-/g, ' '),
                  description: v.description
                    ? v.description.replace(/<[^>]+>/g, '').trim()
                    : undefined,
                  thumbnailUrl: v.thumbnail_link,
                  playbackUrl: v.direct_url || '',
                  visibility: 'public',
                  isActive: true,
                  publishedAt: v.db_timestamp
                    ? new Date(v.db_timestamp)
                    : undefined,
                },
                $set: { externalId: v.video_id },
              },
              upsert: true,
            },
          }));

          const videoResult = await this.videoModel.bulkWrite(videoOps);
          videosCreated += videoResult.upsertedCount;
          videosSkipped += videos.length - videoResult.upsertedCount;
        } catch (error) {
          const msg = `Error syncing videos for ${cat.category_name}: ${error}`;
          this.logger.error(msg);
          errors.push(msg);
        }
      }

      // Step 5: Resolve missing playback URLs
      this.syncState.progress = {
        current: 0,
        total: 0,
        phase: 'Resolving video URLs...',
      };

      const videosNeedingUrl = await this.videoModel.find({
        externalId: { $exists: true, $ne: null },
        $or: [{ playbackUrl: '' }, { playbackUrl: { $exists: false } }],
      });

      if (videosNeedingUrl.length > 0) {
        this.syncState.progress = {
          current: 0,
          total: videosNeedingUrl.length,
          phase: 'Resolving video URLs...',
        };

        const BATCH_SIZE = 5;
        for (let i = 0; i < videosNeedingUrl.length; i += BATCH_SIZE) {
          const batch = videosNeedingUrl.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(
            batch.map(async (video) => {
              const url = await this.rtvApi.scrapeVideoUrl(video.externalId!);
              return { videoId: video._id, url };
            }),
          );

          for (const { videoId, url } of results) {
            if (url) {
              await this.videoModel.updateOne(
                { _id: videoId },
                { $set: { playbackUrl: url } },
              );
              videoUrlsResolved++;
            }
          }

          this.syncState.progress = {
            current: Math.min(i + BATCH_SIZE, videosNeedingUrl.length),
            total: videosNeedingUrl.length,
            phase: 'Resolving video URLs...',
          };

          // 200ms delay between batches
          if (i + BATCH_SIZE < videosNeedingUrl.length) {
            await new Promise((r) => setTimeout(r, 200));
          }
        }
      }

      const durationMs = Date.now() - startTime;
      const result: ContentSyncResultDto = {
        programsCreated,
        programsSkipped,
        videosCreated,
        videosSkipped,
        videoUrlsResolved,
        errors,
        durationMs,
      };

      this.syncState = {
        state: 'completed',
        lastContentResult: result,
        lastSyncAt: new Date().toISOString(),
      };

      this.logger.log(
        `Content sync completed in ${durationMs}ms: ${programsCreated} programs, ${videosCreated} videos created`,
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        this.syncState = {
          state: 'error',
          error: error.message,
        };
        throw error;
      }
      const msg = `Content sync failed: ${error}`;
      this.logger.error(msg);
      errors.push(msg);
      const result: ContentSyncResultDto = {
        programsCreated,
        programsSkipped,
        videosCreated,
        videosSkipped,
        videoUrlsResolved,
        errors,
        durationMs,
      };
      this.syncState = {
        state: 'error',
        error: msg,
        lastContentResult: result,
      };
      return result;
    }
  }

  async syncSchedule(): Promise<ScheduleSyncResultDto> {
    if (
      this.syncState.state === 'syncing-content' ||
      this.syncState.state === 'syncing-schedule'
    ) {
      throw new ConflictException('A sync operation is already in progress');
    }

    const startTime = Date.now();
    const errors: string[] = [];
    let programsCreated = 0;
    let schedulesCreated = 0;
    let schedulesSkipped = 0;
    let usedFallback = false;
    let duplicatesRemoved = 0;

    try {
      this.syncState = {
        state: 'syncing-schedule',
        progress: { current: 0, total: 0, phase: 'Finding channel...' },
      };

      // Step 1: Find channel
      const channel = await this.channelModel.findOne({ slug: 'rhapsody-tv' });
      if (!channel) {
        throw new NotFoundException(
          'Channel "rhapsody-tv" not found. Create it first.',
        );
      }
      const channelId = channel._id as Types.ObjectId;

      // Step 2: Get schedule data
      this.syncState.progress = {
        current: 0,
        total: 3,
        phase: 'Fetching schedule...',
      };

      let scheduleEntries: ParsedScheduleEntry[] | null = null;
      const jsContent = await this.rtvApi.fetchScheduleJs();
      if (jsContent) {
        scheduleEntries = this.scheduleParser.parseScheduleJs(jsContent);
      }

      if (!scheduleEntries) {
        usedFallback = true;
        scheduleEntries = this.scheduleParser.getFallbackSchedule();
        this.logger.log(
          `Using fallback schedule data (${scheduleEntries.length} entries)`,
        );
      }

      const rawScheduleCount = scheduleEntries.length;
      scheduleEntries = this.dedupeScheduleEntries(scheduleEntries);
      if (scheduleEntries.length !== rawScheduleCount) {
        this.logger.log(
          `Deduplicated schedule entries by name/time (case-insensitive): ${rawScheduleCount} -> ${scheduleEntries.length}`,
        );
      }

      // Step 3: Get or create programs for each unique program name
      this.syncState.progress = {
        current: 1,
        total: 3,
        phase: 'Matching programs...',
      };

      const canonicalNamesByKey = new Map<string, string>();
      for (const entry of scheduleEntries) {
        const key = this.normalizeScheduleNameKey(entry.programName);
        if (!canonicalNamesByKey.has(key)) {
          canonicalNamesByKey.set(key, entry.programName.trim());
        }
      }
      const uniqueNames = Array.from(canonicalNamesByKey.values());
      const programIdMap = new Map<string, Types.ObjectId>();

      // Load all existing programs for this channel
      const existingPrograms = await this.programModel.find({ channelId });
      const titleToProgram = new Map<string, ProgramDocument>();
      for (const p of existingPrograms) {
        titleToProgram.set(p.title.toLowerCase(), p);
      }

      for (const name of uniqueNames) {
        const lowerName = this.normalizeScheduleNameKey(name);
        // Try exact match first
        let program = titleToProgram.get(lowerName);

        // Try case-insensitive partial match
        if (!program) {
          for (const [title, p] of titleToProgram) {
            if (title.includes(lowerName) || lowerName.includes(title)) {
              program = p;
              break;
            }
          }
        }

        if (program) {
          programIdMap.set(lowerName, program._id as Types.ObjectId);
        } else {
          // Create new program
          const newProgram = await this.programModel.create({
            channelId,
            title: name,
            announcementType: AnnouncementType.SHOW,
            category: 'RTV',
            isActive: true,
          });
          programIdMap.set(lowerName, newProgram._id as Types.ObjectId);
          titleToProgram.set(lowerName, newProgram);
          programsCreated++;
        }
      }

      // Step 4: Upsert schedule entries
      this.syncState.progress = {
        current: 2,
        total: 3,
        phase: 'Creating schedules...',
      };

      const scheduleOps: AnyBulkWriteOperation<any>[] = [];
      for (const entry of scheduleEntries) {
        const targetId = programIdMap.get(
          this.normalizeScheduleNameKey(entry.programName),
        );
        if (!targetId) continue;

        scheduleOps.push({
          updateOne: {
            filter: {
              targetId,
              startTimeOfDay: entry.startTime,
              endTimeOfDay: entry.endTime,
              scheduleType: ScheduleType.WEEKLY,
            },
            update: {
              $setOnInsert: {
                targetType: ScheduleTargetType.PROGRAM,
                targetId,
                scheduleType: ScheduleType.WEEKLY,
                startTimeOfDay: entry.startTime,
                endTimeOfDay: entry.endTime,
                timezone: 'Africa/Lagos',
                isActive: true,
              },
              $set: {
                daysOfWeek: entry.days,
              },
            },
            upsert: true,
          },
        });
      }

      if (scheduleOps.length > 0) {
        const scheduleResult =
          await this.scheduleModel.bulkWrite(scheduleOps);
        schedulesCreated = scheduleResult.upsertedCount;
        schedulesSkipped = scheduleOps.length - scheduleResult.upsertedCount;
      }

      duplicatesRemoved = await this.cleanupDuplicateSchedulesForChannel(
        channelId,
      );
      if (duplicatesRemoved > 0) {
        this.logger.log(
          `Removed ${duplicatesRemoved} duplicate schedules (case-insensitive name match)`,
        );
      }

      const durationMs = Date.now() - startTime;
      const result: ScheduleSyncResultDto = {
        programsCreated,
        schedulesCreated,
        schedulesSkipped,
        usedFallback,
        errors,
        durationMs,
      };

      this.syncState = {
        state: 'completed',
        lastScheduleResult: result,
        lastSyncAt: new Date().toISOString(),
      };

      this.logger.log(
        `Schedule sync completed in ${durationMs}ms: ${schedulesCreated} schedules created, ${programsCreated} programs created, ${duplicatesRemoved} duplicates removed`,
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        this.syncState = {
          state: 'error',
          error: error.message,
        };
        throw error;
      }
      const msg = `Schedule sync failed: ${error}`;
      this.logger.error(msg);
      errors.push(msg);
      const result: ScheduleSyncResultDto = {
        programsCreated,
        schedulesCreated,
        schedulesSkipped,
        usedFallback,
        errors,
        durationMs,
      };
      this.syncState = {
        state: 'error',
        error: msg,
        lastScheduleResult: result,
      };
      return result;
    }
  }
}

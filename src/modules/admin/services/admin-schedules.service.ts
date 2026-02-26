import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Schedule,
  ScheduleDocument,
  ScheduleTargetType,
  ScheduleType,
} from '../../channel/schemas/schedule.schema';
import { Channel, ChannelDocument } from '../../channel/schemas/channel.schema';
import { Program, ProgramDocument } from '../../channel/schemas/program.schema';
import { CreateScheduleDto, UpdateScheduleDto } from '../dto/schedules';
import { normalizeScheduleData } from '../../channel/utils/schedule-utils';
import { NotificationsService } from '../../notifications/notifications.service';

type ScheduleListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  targetType?: ScheduleTargetType;
  scheduleType?: ScheduleType;
};

type NormalizedScheduleDuplicateInput = {
  targetType: ScheduleTargetType;
  targetId: string;
  scheduleType: ScheduleType;
  startTimeOfDay?: string;
  endTimeOfDay?: string;
  daysOfWeek?: number[];
  startTime?: Date;
  endTime?: Date;
  title?: string;
};

@Injectable()
export class AdminSchedulesService {
  constructor(
    @InjectModel(Schedule.name)
    private readonly scheduleModel: Model<ScheduleDocument>,
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(Program.name)
    private readonly programModel: Model<ProgramDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private normalizeScheduleName(name?: string | null): string | undefined {
    const trimmed = name?.trim();
    if (!trimmed) return undefined;
    return trimmed.toLowerCase();
  }

  private normalizeDays(days?: number[]): number[] | undefined {
    if (!days?.length) return undefined;
    return [...new Set(days)].sort((a, b) => a - b);
  }

  private isSameDate(a?: Date, b?: Date): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.getTime() === b.getTime();
  }

  private sameScheduleTiming(
    existing: ScheduleDocument,
    input: NormalizedScheduleDuplicateInput,
  ): boolean {
    if (
      existing.targetType !== input.targetType ||
      String(existing.targetId) !== String(input.targetId) ||
      existing.scheduleType !== input.scheduleType
    ) {
      return false;
    }

    if (input.scheduleType === ScheduleType.ONCE) {
      return (
        this.isSameDate(existing.startTime, input.startTime) &&
        this.isSameDate(existing.endTime, input.endTime)
      );
    }

    if (
      (existing.startTimeOfDay || undefined) !== (input.startTimeOfDay || undefined) ||
      (existing.endTimeOfDay || undefined) !== (input.endTimeOfDay || undefined)
    ) {
      return false;
    }

    if (input.scheduleType === ScheduleType.WEEKLY) {
      const existingDays = this.normalizeDays(existing.daysOfWeek);
      const inputDays = this.normalizeDays(input.daysOfWeek);
      return JSON.stringify(existingDays ?? []) === JSON.stringify(inputDays ?? []);
    }

    return true;
  }

  private async assertNoDuplicateSchedule(
    input: NormalizedScheduleDuplicateInput,
    excludeId?: string,
  ): Promise<void> {
    const baseFilter: Record<string, unknown> = {
      targetType: input.targetType,
      targetId: input.targetId,
      scheduleType: input.scheduleType,
    };

    if (input.scheduleType === ScheduleType.ONCE) {
      baseFilter.startTime = input.startTime;
      baseFilter.endTime = input.endTime;
    } else {
      baseFilter.startTimeOfDay = input.startTimeOfDay;
      baseFilter.endTimeOfDay = input.endTimeOfDay;
    }

    const candidates = await this.scheduleModel.find(baseFilter);
    const incomingName = this.normalizeScheduleName(input.title);

    for (const candidate of candidates) {
      if (excludeId && String(candidate._id) === excludeId) continue;
      if (!this.sameScheduleTiming(candidate, input)) continue;

      const candidateName = this.normalizeScheduleName(candidate.title);
      const namesMatch =
        incomingName !== undefined
          ? candidateName === incomingName
          : candidateName === undefined;

      if (namesMatch) {
        throw new BadRequestException(
          'Duplicate schedule detected (same name/timing, case-insensitive)',
        );
      }
    }
  }

  private async validateTarget(
    targetType: ScheduleTargetType,
    targetId: string,
  ): Promise<void> {
    if (targetType === ScheduleTargetType.CHANNEL) {
      const channel = await this.channelModel.findById(targetId).select('_id');
      if (!channel) {
        throw new BadRequestException('Target channel not found');
      }
    } else {
      const program = await this.programModel.findById(targetId).select('_id');
      if (!program) {
        throw new BadRequestException('Target program not found');
      }
    }
  }

  async create(dto: CreateScheduleDto): Promise<ScheduleDocument> {
    await this.validateTarget(dto.targetType, dto.targetId);

    const normalized = normalizeScheduleData(dto);

    await this.assertNoDuplicateSchedule({
      targetType: dto.targetType,
      targetId: dto.targetId,
      scheduleType: normalized.scheduleType as ScheduleType,
      startTimeOfDay: normalized.startTimeOfDay as string | undefined,
      endTimeOfDay: normalized.endTimeOfDay as string | undefined,
      daysOfWeek: normalized.daysOfWeek as number[] | undefined,
      startTime: normalized.startTime as Date | undefined,
      endTime: normalized.endTime as Date | undefined,
      title: dto.title,
    });

    const schedule = new this.scheduleModel({
      targetType: dto.targetType,
      targetId: dto.targetId,
      title: dto.title,
      description: dto.description,
      isActive: true,
      ...normalized,
    });

    const saved = await schedule.save();

    // Notify channel subscribers about the new schedule
    this.notificationsService
      .notifyNewSchedule({
        scheduleId: saved._id.toString(),
        targetType: dto.targetType,
        targetId: dto.targetId,
        scheduleTitle: dto.title,
      })
      .catch(() => {
        // Notification failure should not block schedule creation
      });

    return saved;
  }

  private async populateTargetNames(
    schedules: ScheduleDocument[],
  ): Promise<any[]> {
    const channelIds = schedules
      .filter((s) => s.targetType === ScheduleTargetType.CHANNEL)
      .map((s) => s.targetId);
    const programIds = schedules
      .filter((s) => s.targetType === ScheduleTargetType.PROGRAM)
      .map((s) => s.targetId);

    const [channels, programs] = await Promise.all([
      channelIds.length
        ? this.channelModel
            .find({ _id: { $in: channelIds } })
            .select('_id name')
            .lean()
        : [],
      programIds.length
        ? this.programModel
            .find({ _id: { $in: programIds } })
            .select('_id title')
            .lean()
        : [],
    ]);

    const channelMap = new Map<string, string>();
    for (const c of channels) {
      channelMap.set(String(c._id), c.name);
    }
    const programMap = new Map<string, string>();
    for (const p of programs) {
      programMap.set(String(p._id), p.title);
    }

    return schedules.map((s) => {
      const obj = s.toObject({ virtuals: true }) as any;
      obj.targetName =
        s.targetType === ScheduleTargetType.CHANNEL
          ? channelMap.get(String(s.targetId))
          : programMap.get(String(s.targetId));
      return obj;
    });
  }

  async findAll(
    params: ScheduleListParams = {},
  ): Promise<{ schedules: any[]; total: number; pages: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'asc',
      search,
      targetType,
      scheduleType,
    } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, unknown> = {};
    if (targetType) {
      filter.targetType = targetType;
    }
    if (scheduleType) {
      filter.scheduleType = scheduleType;
    }
    if (search?.trim()) {
      const value = search.trim();
      filter.$or = [
        { title: { $regex: value, $options: 'i' } },
        { description: { $regex: value, $options: 'i' } },
      ];
    }

    const allowedSortFields = new Set([
      'startTime',
      'createdAt',
      'updatedAt',
      'scheduleType',
      'targetType',
    ]);
    const resolvedSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
    const resolvedSortOrder = sortOrder === 'desc' ? -1 : 1;

    const [schedules, total] = await Promise.all([
      this.scheduleModel
        .find(filter)
        .skip(skip)
        .limit(safeLimit)
        .sort({ [resolvedSortBy]: resolvedSortOrder }),
      this.scheduleModel.countDocuments(filter),
    ]);

    const enriched = await this.populateTargetNames(schedules);

    return {
      schedules: enriched,
      total,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async findById(id: string): Promise<any> {
    const schedule = await this.scheduleModel.findById(id);

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const [enriched] = await this.populateTargetNames([schedule]);
    return enriched;
  }

  async update(
    id: string,
    dto: UpdateScheduleDto,
  ): Promise<ScheduleDocument> {
    const existing = await this.scheduleModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Schedule not found');
    }

    const normalized = normalizeScheduleData(dto, existing);
    await this.assertNoDuplicateSchedule(
      {
        targetType: existing.targetType,
        targetId: String(existing.targetId),
        scheduleType: normalized.scheduleType as ScheduleType,
        startTimeOfDay: normalized.startTimeOfDay as string | undefined,
        endTimeOfDay: normalized.endTimeOfDay as string | undefined,
        daysOfWeek: normalized.daysOfWeek as number[] | undefined,
        startTime: normalized.startTime as Date | undefined,
        endTime: normalized.endTime as Date | undefined,
        title: dto.title !== undefined ? dto.title : existing.title,
      },
      id,
    );

    const updateData: Record<string, unknown> = {
      ...normalized,
    };
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;

    const schedule = await this.scheduleModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  async remove(id: string): Promise<void> {
    const result = await this.scheduleModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Schedule not found');
    }
  }
}

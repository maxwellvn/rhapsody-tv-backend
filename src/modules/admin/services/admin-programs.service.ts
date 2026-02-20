import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Program,
  ProgramDocument,
  ProgramScheduleType,
} from '../../channel/schemas/program.schema';
import { CreateProgramDto, UpdateProgramDto } from '../dto/programs';
import { NotificationsService } from '../../notifications';

type ProgramListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  scheduleType?: ProgramScheduleType;
};

@Injectable()
export class AdminProgramsService {
  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private toDate(value?: string | Date): Date | undefined {
    if (!value) return undefined;
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed;
  }

  private durationFromTimes(startTimeOfDay: string, endTimeOfDay: string): number {
    const [startHours, startMinutes] = startTimeOfDay.split(':').map(Number);
    const [endHours, endMinutes] = endTimeOfDay.split(':').map(Number);
    const start = startHours * 60 + startMinutes;
    const end = endHours * 60 + endMinutes;
    const duration = end > start ? end - start : 24 * 60 - start + end;
    return duration;
  }

  private dateFromTimeOfDay(timeOfDay: string, base: Date): Date {
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    const date = new Date(base);
    date.setUTCHours(hours, minutes, 0, 0);
    return date;
  }

  private normalizeProgramData(
    dto: Partial<CreateProgramDto>,
    existing?: ProgramDocument,
  ): Record<string, unknown> {
    const scheduleType =
      dto.scheduleType ??
      existing?.scheduleType ??
      ProgramScheduleType.ONCE;

    const category = dto.category ?? existing?.category;
    const description = dto.description ?? existing?.description;
    const thumbnailUrl = dto.thumbnailUrl ?? existing?.thumbnailUrl;
    const timezone = dto.timezone ?? existing?.timezone ?? 'UTC';

    if (scheduleType === ProgramScheduleType.ONCE) {
      const startTime = this.toDate(dto.startTime ?? existing?.startTime);
      const endTime = this.toDate(dto.endTime ?? existing?.endTime);

      if (!startTime || !endTime) {
        throw new BadRequestException(
          'startTime and endTime are required for once schedules',
        );
      }

      if (endTime <= startTime) {
        throw new BadRequestException('endTime must be after startTime');
      }

      return {
        scheduleType,
        startTime,
        endTime,
        durationInMinutes: Math.round(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60),
        ),
        startTimeOfDay: undefined,
        endTimeOfDay: undefined,
        daysOfWeek: undefined,
        timezone,
        category,
        description,
        thumbnailUrl,
      };
    }

    const startTimeOfDay =
      dto.startTimeOfDay ?? existing?.startTimeOfDay ?? undefined;
    const endTimeOfDay = dto.endTimeOfDay ?? existing?.endTimeOfDay ?? undefined;

    if (!startTimeOfDay || !endTimeOfDay) {
      throw new BadRequestException(
        'startTimeOfDay and endTimeOfDay are required for recurring schedules',
      );
    }

    const daysOfWeek =
      scheduleType === ProgramScheduleType.WEEKLY
        ? (dto.daysOfWeek ?? existing?.daysOfWeek ?? [])
        : undefined;

    if (
      scheduleType === ProgramScheduleType.WEEKLY &&
      (!daysOfWeek || daysOfWeek.length === 0)
    ) {
      throw new BadRequestException(
        'daysOfWeek must be provided for weekly schedules',
      );
    }

    const effectiveReferenceDate =
      this.toDate(dto.startTime ?? existing?.startTime) ?? new Date();
    const resolvedStartTime = this.dateFromTimeOfDay(
      startTimeOfDay,
      effectiveReferenceDate,
    );
    const fallbackEndTime = this.dateFromTimeOfDay(
      endTimeOfDay,
      effectiveReferenceDate,
    );
    if (fallbackEndTime <= resolvedStartTime) {
      fallbackEndTime.setUTCDate(fallbackEndTime.getUTCDate() + 1);
    }
    const effectiveEnd =
      this.toDate(dto.endTime ?? existing?.endTime) ?? fallbackEndTime;

    return {
      scheduleType,
      startTimeOfDay,
      endTimeOfDay,
      daysOfWeek,
      startTime: resolvedStartTime,
      endTime: effectiveEnd,
      durationInMinutes: this.durationFromTimes(startTimeOfDay, endTimeOfDay),
      timezone,
      category,
      description,
      thumbnailUrl,
    };
  }

  async create(dto: CreateProgramDto): Promise<ProgramDocument> {
    const normalized = this.normalizeProgramData(dto);
    const program = new this.programModel({
      title: dto.title,
      channelId: dto.channelId,
      isActive: true,
      ...normalized,
    });

    const saved = await program.save();

    if (saved.isActive) {
      await this.notificationsService.notifyNewProgram({
        channelId: saved.channelId.toString(),
        programId: saved._id.toString(),
        programTitle: saved.title,
        startTime: saved.startTime.toISOString(),
      });
    }

    return saved;
  }

  async findAll(
    params: ProgramListParams = {},
  ): Promise<{ programs: ProgramDocument[]; total: number; pages: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'startTime',
      sortOrder = 'asc',
      search,
      scheduleType,
    } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, unknown> = {};
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
      'title',
      'scheduleType',
    ]);
    const resolvedSortBy = allowedSortFields.has(sortBy) ? sortBy : 'startTime';
    const resolvedSortOrder = sortOrder === 'desc' ? -1 : 1;

    const [programs, total] = await Promise.all([
      this.programModel
        .find(filter)
        .skip(skip)
        .limit(safeLimit)
        .populate('channelId', 'name slug logoUrl')
        .sort({ [resolvedSortBy]: resolvedSortOrder }),
      this.programModel.countDocuments(filter),
    ]);

    return {
      programs,
      total,
      pages: Math.ceil(total / safeLimit),
    };
  }

  async findById(id: string): Promise<ProgramDocument> {
    const program = await this.programModel
      .findById(id)
      .populate('channelId', 'name slug');

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async update(id: string, dto: UpdateProgramDto): Promise<ProgramDocument> {
    const existing = await this.programModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Program not found');
    }

    const normalized = this.normalizeProgramData(dto, existing);
    const updateData: Record<string, unknown> = {
      ...normalized,
      title: dto.title ?? existing.title,
    };

    const program = await this.programModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async remove(id: string): Promise<void> {
    const result = await this.programModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Program not found');
    }
  }
}

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

type ScheduleListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  targetType?: ScheduleTargetType;
  scheduleType?: ScheduleType;
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
  ) {}

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

    const schedule = new this.scheduleModel({
      targetType: dto.targetType,
      targetId: dto.targetId,
      title: dto.title,
      description: dto.description,
      isActive: true,
      ...normalized,
    });

    return schedule.save();
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

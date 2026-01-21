import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Program,
  ProgramDocument,
  ScheduleType,
} from '../../channel/schemas/program.schema';
import { CreateProgramDto, UpdateProgramDto } from '../dto/programs';

@Injectable()
export class AdminProgramsService {
  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,
  ) {}

  /**
   * Calculate duration in minutes from time strings (HH:mm format)
   */
  private calculateDurationFromTimeStrings(
    startTimeOfDay: string,
    endTimeOfDay: string,
  ): number {
    const [startHour, startMin] = startTimeOfDay.split(':').map(Number);
    const [endHour, endMin] = endTimeOfDay.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    let endMinutes = endHour * 60 + endMin;

    // Handle overnight programs (e.g., 23:00 to 01:00)
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60;
    }

    return endMinutes - startMinutes;
  }

  /**
   * Validate the DTO based on schedule type
   */
  private validateScheduleDto(dto: CreateProgramDto): void {
    const { scheduleType, startTimeOfDay, endTimeOfDay, daysOfWeek, startTime, endTime } = dto;

    if (scheduleType === ScheduleType.DAILY || scheduleType === ScheduleType.WEEKLY) {
      if (!startTimeOfDay || !endTimeOfDay) {
        throw new BadRequestException(
          `For ${scheduleType} schedules, startTimeOfDay and endTimeOfDay are required`,
        );
      }
    }

    if (scheduleType === ScheduleType.WEEKLY) {
      if (!daysOfWeek || daysOfWeek.length === 0) {
        throw new BadRequestException(
          'For weekly schedules, daysOfWeek must contain at least one day',
        );
      }
    }

    if (scheduleType === ScheduleType.ONCE) {
      if (!startTime || !endTime) {
        throw new BadRequestException(
          'For one-time programs, startTime and endTime are required',
        );
      }
    }
  }

  async create(dto: CreateProgramDto): Promise<ProgramDocument> {
    // Validate based on schedule type
    this.validateScheduleDto(dto);

    let durationInMinutes: number | undefined;

    // Calculate duration based on schedule type
    if (dto.scheduleType === ScheduleType.ONCE && dto.startTime && dto.endTime) {
      const startTime = new Date(dto.startTime);
      const endTime = new Date(dto.endTime);
      durationInMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60),
      );
    } else if (dto.startTimeOfDay && dto.endTimeOfDay) {
      durationInMinutes = this.calculateDurationFromTimeStrings(
        dto.startTimeOfDay,
        dto.endTimeOfDay,
      );
    }

    const programData: Partial<Program> = {
      channelId: dto.channelId as any,
      title: dto.title,
      description: dto.description,
      scheduleType: dto.scheduleType,
      category: dto.category,
      timezone: dto.timezone || 'UTC',
      thumbnailUrl: dto.thumbnailUrl,
      durationInMinutes,
    };

    // Set fields based on schedule type
    if (dto.scheduleType === ScheduleType.DAILY || dto.scheduleType === ScheduleType.WEEKLY) {
      programData.startTimeOfDay = dto.startTimeOfDay;
      programData.endTimeOfDay = dto.endTimeOfDay;
      
      // Optional: effective date range for recurring schedules
      if (dto.startTime) {
        programData.startTime = new Date(dto.startTime);
      }
      if (dto.endTime) {
        programData.endTime = new Date(dto.endTime);
      }
    }

    if (dto.scheduleType === ScheduleType.WEEKLY) {
      programData.daysOfWeek = dto.daysOfWeek;
    }

    if (dto.scheduleType === ScheduleType.ONCE) {
      programData.startTime = new Date(dto.startTime!);
      programData.endTime = new Date(dto.endTime!);
    }

    const program = new this.programModel(programData);
    return program.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    scheduleType?: ScheduleType,
  ): Promise<{ programs: ProgramDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};

    if (scheduleType) {
      filter.scheduleType = scheduleType;
    }

    const [programs, total] = await Promise.all([
      this.programModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name slug logoUrl')
        .sort({ createdAt: -1 }),
      this.programModel.countDocuments(filter),
    ]);

    return {
      programs,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ProgramDocument> {
    const program = await this.programModel
      .findById(id)
      .populate('channelId', 'name slug logoUrl');

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async update(id: string, dto: UpdateProgramDto): Promise<ProgramDocument> {
    const existingProgram = await this.programModel.findById(id);
    if (!existingProgram) {
      throw new NotFoundException('Program not found');
    }

    const updateData: Record<string, unknown> = {};

    // Handle basic fields
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.timezone !== undefined) updateData.timezone = dto.timezone;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;

    // Handle schedule type change
    if (dto.scheduleType !== undefined) {
      updateData.scheduleType = dto.scheduleType;
    }

    const scheduleType = (dto.scheduleType || existingProgram.scheduleType) as ScheduleType;

    // Handle time-related fields based on schedule type
    if (scheduleType === ScheduleType.DAILY || scheduleType === ScheduleType.WEEKLY) {
      if (dto.startTimeOfDay !== undefined) updateData.startTimeOfDay = dto.startTimeOfDay;
      if (dto.endTimeOfDay !== undefined) updateData.endTimeOfDay = dto.endTimeOfDay;
      if (dto.daysOfWeek !== undefined) updateData.daysOfWeek = dto.daysOfWeek;

      // Calculate duration from time of day
      const startTimeOfDay = dto.startTimeOfDay || existingProgram.startTimeOfDay;
      const endTimeOfDay = dto.endTimeOfDay || existingProgram.endTimeOfDay;
      if (startTimeOfDay && endTimeOfDay) {
        updateData.durationInMinutes = this.calculateDurationFromTimeStrings(
          startTimeOfDay,
          endTimeOfDay,
        );
      }

      // Optional effective date range
      if (dto.startTime !== undefined) {
        updateData.startTime = dto.startTime ? new Date(dto.startTime) : null;
      }
      if (dto.endTime !== undefined) {
        updateData.endTime = dto.endTime ? new Date(dto.endTime) : null;
      }
    }

    if (scheduleType === ScheduleType.ONCE) {
      if (dto.startTime !== undefined) {
        updateData.startTime = new Date(dto.startTime);
      }
      if (dto.endTime !== undefined) {
        updateData.endTime = new Date(dto.endTime);
      }

      // Calculate duration for one-time programs
      const startTime = dto.startTime
        ? new Date(dto.startTime)
        : existingProgram.startTime;
      const endTime = dto.endTime
        ? new Date(dto.endTime)
        : existingProgram.endTime;

      if (startTime && endTime) {
        updateData.durationInMinutes = Math.round(
          (endTime.getTime() - startTime.getTime()) / (1000 * 60),
        );
      }
    }

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

  /**
   * Get programs that should be airing at a specific time
   * Useful for schedule display
   */
  async findProgramsAtTime(
    date: Date,
    channelId?: string,
  ): Promise<ProgramDocument[]> {
    const dayOfWeek = date.getDay();
    const timeOfDay = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

    const filter: Record<string, any> = {
      isActive: true,
      $or: [
        // Daily programs
        {
          scheduleType: ScheduleType.DAILY,
          startTimeOfDay: { $lte: timeOfDay },
          endTimeOfDay: { $gte: timeOfDay },
        },
        // Weekly programs on this day
        {
          scheduleType: ScheduleType.WEEKLY,
          daysOfWeek: dayOfWeek,
          startTimeOfDay: { $lte: timeOfDay },
          endTimeOfDay: { $gte: timeOfDay },
        },
        // One-time programs happening now
        {
          scheduleType: ScheduleType.ONCE,
          startTime: { $lte: date },
          endTime: { $gte: date },
        },
      ],
    };

    if (channelId) {
      filter.channelId = channelId;
    }

    return this.programModel
      .find(filter)
      .populate('channelId', 'name slug logoUrl')
      .sort({ startTimeOfDay: 1, startTime: 1 });
  }
}

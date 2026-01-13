import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Program, ProgramDocument } from '../../channel/schemas/program.schema';
import { CreateProgramDto, UpdateProgramDto } from '../dto/programs';

@Injectable()
export class AdminProgramsService {
  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,
  ) {}

  async create(dto: CreateProgramDto): Promise<ProgramDocument> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    const durationInMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / (1000 * 60),
    );

    const program = new this.programModel({
      ...dto,
      channelId: dto.channelId,
      startTime,
      endTime,
      durationInMinutes,
    });

    return program.save();
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ programs: ProgramDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [programs, total] = await Promise.all([
      this.programModel
        .find()
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name slug')
        .sort({ startTime: 1 }),
      this.programModel.countDocuments(),
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
      .populate('channelId', 'name slug');

    if (!program) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  async update(id: string, dto: UpdateProgramDto): Promise<ProgramDocument> {
    const updateData: Record<string, unknown> = { ...dto };

    if (dto.startTime) {
      updateData.startTime = new Date(dto.startTime);
    }
    if (dto.endTime) {
      updateData.endTime = new Date(dto.endTime);
    }
    if (dto.startTime && dto.endTime) {
      const startTime = new Date(dto.startTime);
      const endTime = new Date(dto.endTime);
      updateData.durationInMinutes = Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60),
      );
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
}

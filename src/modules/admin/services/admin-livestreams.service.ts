import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamStatus,
  LiveStreamScheduleType,
} from '../../stream/schemas/live-stream.schema';
import {
  CreateLivestreamDto,
  UpdateLivestreamDto,
  UpdateLivestreamStatusDto,
} from '../dto/livestreams';

@Injectable()
export class AdminLivestreamsService {
  constructor(
    @InjectModel(LiveStream.name)
    private livestreamModel: Model<LiveStreamDocument>,
  ) {}

  async create(dto: CreateLivestreamDto): Promise<LiveStreamDocument> {
    const scheduleType = dto.scheduleType || 'continuous';
    
    // For continuous streams, default to LIVE status
    // For scheduled streams, default to SCHEDULED status
    const defaultStatus = scheduleType === 'continuous' 
      ? LiveStreamStatus.LIVE 
      : LiveStreamStatus.SCHEDULED;

    const livestream = new this.livestreamModel({
      ...dto,
      channelId: new Types.ObjectId(dto.channelId),
      programId: dto.programId ? new Types.ObjectId(dto.programId) : undefined,
      scheduleType,
      status: defaultStatus,
      // Set startedAt if creating as LIVE
      startedAt: defaultStatus === LiveStreamStatus.LIVE ? new Date() : undefined,
    });

    return livestream.save();
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{
    livestreams: LiveStreamDocument[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [livestreams, total] = await Promise.all([
      this.livestreamModel
        .find()
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name slug')
        .populate('programId', 'name slug')
        .sort({ createdAt: -1 }),
      this.livestreamModel.countDocuments(),
    ]);

    return {
      livestreams,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<LiveStreamDocument> {
    const livestream = await this.livestreamModel
      .findById(id)
      .populate('channelId', 'name slug')
      .populate('programId', 'name slug');

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return livestream;
  }

  async update(
    id: string,
    dto: UpdateLivestreamDto,
  ): Promise<LiveStreamDocument> {
    // First, get the existing livestream to check its state
    const existing = await this.livestreamModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Livestream not found');
    }

    // Build update data with ObjectId conversion
    const updateData: Record<string, unknown> = { ...dto };
    if (dto.programId) {
      updateData.programId = new Types.ObjectId(dto.programId);
    }

    // If livestream is LIVE and doesn't have startedAt, set it
    // Use createdAt from timestamps (available on document but not in type)
    if (existing.status === LiveStreamStatus.LIVE && !existing.startedAt) {
      updateData.startedAt = (existing as any).createdAt || new Date();
    }

    const livestream = await this.livestreamModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    return livestream!;
  }

  async updateStatus(
    id: string,
    dto: UpdateLivestreamStatusDto,
  ): Promise<LiveStreamDocument> {
    const updateData: Record<string, unknown> = { status: dto.status };

    if (dto.status === LiveStreamStatus.LIVE) {
      updateData.startedAt = new Date();
    } else if (dto.status === LiveStreamStatus.ENDED) {
      updateData.endedAt = new Date();
    }

    const livestream = await this.livestreamModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true },
    );

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return livestream;
  }

  async remove(id: string): Promise<void> {
    const result = await this.livestreamModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Livestream not found');
    }
  }
}

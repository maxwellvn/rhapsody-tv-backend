import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamStatus,
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
    const livestream = new this.livestreamModel({
      ...dto,
      channelId: dto.channelId,
      status: LiveStreamStatus.SCHEDULED,
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
      .populate('channelId', 'name slug');

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return livestream;
  }

  async update(
    id: string,
    dto: UpdateLivestreamDto,
  ): Promise<LiveStreamDocument> {
    const livestream = await this.livestreamModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return livestream;
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

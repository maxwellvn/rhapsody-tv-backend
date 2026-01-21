import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Video, VideoDocument } from '../../stream/schemas/video.schema';
import { CreateVideoDto, UpdateVideoDto } from '../dto/videos';

@Injectable()
export class AdminVideosService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
  ) {}

  async create(dto: CreateVideoDto): Promise<VideoDocument> {
    const video = new this.videoModel({
      ...dto,
      channelId: dto.channelId,
      programId: dto.programId,
    });

    return video.save();
  }

  async findAll(
    page = 1,
    limit = 10,
    programId?: string,
  ): Promise<{ videos: VideoDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};
    
    if (programId) {
      filter.programId = programId;
    }

    const [videos, total] = await Promise.all([
      this.videoModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name slug')
        .populate('programId', 'title')
        .sort({ createdAt: -1 }),
      this.videoModel.countDocuments(filter),
    ]);

    return {
      videos,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findByProgramId(programId: string): Promise<VideoDocument[]> {
    return this.videoModel
      .find({ programId, isActive: true })
      .populate('channelId', 'name slug')
      .populate('programId', 'title')
      .sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<VideoDocument> {
    const video = await this.videoModel
      .findById(id)
      .populate('channelId', 'name slug')
      .populate('programId', 'title');

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async update(id: string, dto: UpdateVideoDto): Promise<VideoDocument> {
    const video = await this.videoModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async remove(id: string): Promise<void> {
    const result = await this.videoModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Video not found');
    }
  }
}

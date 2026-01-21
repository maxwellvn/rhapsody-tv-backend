import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Video, VideoDocument } from '../../stream/schemas/video.schema';
import { CreateVideoDto, UpdateVideoDto } from '../dto/videos';
import { VideoProbeService } from '../../../shared/services/video-probe';

@Injectable()
export class AdminVideosService {
  private readonly logger = new Logger(AdminVideosService.name);

  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly videoProbeService: VideoProbeService,
  ) {}

  async create(dto: CreateVideoDto): Promise<VideoDocument> {
    // Auto-calculate duration if not provided
    let durationSeconds = dto.durationSeconds;
    
    if (!durationSeconds && dto.playbackUrl) {
      this.logger.log(`Auto-calculating duration for: ${dto.playbackUrl}`);
      const probedDuration = await this.videoProbeService.getDuration(dto.playbackUrl);
      if (probedDuration) {
        durationSeconds = probedDuration;
        this.logger.log(`Auto-calculated duration: ${durationSeconds}s`);
      }
    }

    const video = new this.videoModel({
      ...dto,
      channelId: new Types.ObjectId(dto.channelId),
      programId: dto.programId ? new Types.ObjectId(dto.programId) : undefined,
      durationSeconds,
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
    // If playbackUrl is being updated and duration isn't provided, auto-calculate it
    let updateData: any = { ...dto };
    
    // Convert channelId and programId to ObjectId if provided
    if (updateData.channelId) {
      updateData.channelId = new Types.ObjectId(updateData.channelId);
    }
    if (updateData.programId) {
      updateData.programId = new Types.ObjectId(updateData.programId);
    }
    
    if (dto.playbackUrl && !dto.durationSeconds) {
      this.logger.log(`Auto-calculating duration for updated URL: ${dto.playbackUrl}`);
      const probedDuration = await this.videoProbeService.getDuration(dto.playbackUrl);
      if (probedDuration) {
        updateData.durationSeconds = probedDuration;
        this.logger.log(`Auto-calculated duration: ${probedDuration}s`);
      }
    }

    const video = await this.videoModel.findByIdAndUpdate(id, updateData, {
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

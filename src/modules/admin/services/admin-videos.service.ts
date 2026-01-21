import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Video,
  VideoDocument,
  VideoVisibility,
} from '../../stream/schemas/video.schema';
import { CreateVideoDto, UpdateVideoDto } from '../dto/videos';
import { NotificationsService } from '../../notifications';

@Injectable()
export class AdminVideosService {
  constructor(
    @InjectModel(Video.name) private videoModel: Model<VideoDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateVideoDto): Promise<VideoDocument> {
    const video = new this.videoModel({
      ...dto,
      channelId: dto.channelId,
    });

    const saved = await video.save();

    if (saved.isActive && saved.visibility === VideoVisibility.PUBLIC) {
      await this.notificationsService.notifyNewVideo({
        channelId: saved.channelId.toString(),
        videoId: saved._id.toString(),
        videoTitle: saved.title,
      });
    }

    return saved;
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ videos: VideoDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      this.videoModel
        .find()
        .skip(skip)
        .limit(limit)
        .populate('channelId', 'name slug')
        .sort({ createdAt: -1 }),
      this.videoModel.countDocuments(),
    ]);

    return {
      videos,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<VideoDocument> {
    const video = await this.videoModel
      .findById(id)
      .populate('channelId', 'name slug');

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

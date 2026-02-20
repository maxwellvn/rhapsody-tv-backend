import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from '../../channel/schemas/channel.schema';
import {
  LiveStream,
  LiveStreamDocument,
  LiveStreamScheduleType,
  LiveStreamStatus,
} from '../../stream/schemas/live-stream.schema';
import {
  CreateLivestreamDto,
  UpdateLivestreamDto,
  UpdateLivestreamStatusDto,
} from '../dto/livestreams';
import { NotificationsService } from '../../notifications';

@Injectable()
export class AdminLivestreamsService {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    @InjectModel(LiveStream.name)
    private livestreamModel: Model<LiveStreamDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateLivestreamDto): Promise<LiveStreamDocument> {
    const scheduleType =
      dto.scheduleType ?? LiveStreamScheduleType.SCHEDULED;

    const scheduledStartAt = dto.scheduledStartAt
      ? new Date(dto.scheduledStartAt)
      : undefined;
    const scheduledEndAt = dto.scheduledEndAt
      ? new Date(dto.scheduledEndAt)
      : undefined;

    const livestream = new this.livestreamModel({
      channelId: dto.channelId,
      programId: dto.programId,
      title: dto.title,
      description: dto.description,
      scheduleType,
      scheduledStartAt,
      scheduledEndAt,
      thumbnailUrl: dto.thumbnailUrl,
      playbackUrl: dto.playbackUrl,
      isChatEnabled: dto.isChatEnabled ?? true,
      status:
        scheduleType === LiveStreamScheduleType.CONTINUOUS
          ? LiveStreamStatus.LIVE
          : LiveStreamStatus.SCHEDULED,
      startedAt:
        scheduleType === LiveStreamScheduleType.CONTINUOUS
          ? new Date()
          : undefined,
    });

    const saved = await livestream.save();

    const channel = await this.channelModel
      .findById(dto.channelId)
      .select('_id defaultLiveStreamId');
    if (
      channel &&
      (dto.setAsChannelDefault ||
        (scheduleType === LiveStreamScheduleType.CONTINUOUS &&
          !channel.defaultLiveStreamId))
    ) {
      await this.channelModel.findByIdAndUpdate(channel._id, {
        defaultLiveStreamId: saved._id,
      });
    }

    return saved;
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
        .populate('channelId', 'name slug defaultLiveStreamId')
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
      .populate('channelId', 'name slug defaultLiveStreamId');

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    return livestream;
  }

  async update(
    id: string,
    dto: UpdateLivestreamDto,
  ): Promise<LiveStreamDocument> {
    const updateData: Record<string, unknown> = { ...dto };
    delete updateData.setAsChannelDefault;
    if (dto.scheduledStartAt) {
      updateData.scheduledStartAt = new Date(dto.scheduledStartAt);
    }
    if (dto.scheduledEndAt) {
      updateData.scheduledEndAt = new Date(dto.scheduledEndAt);
    }
    if (dto.scheduleType === LiveStreamScheduleType.CONTINUOUS) {
      updateData.status = LiveStreamStatus.LIVE;
      updateData.startedAt = new Date();
    }
    if (dto.scheduleType === LiveStreamScheduleType.SCHEDULED) {
      updateData.status = LiveStreamStatus.SCHEDULED;
    }

    const livestream = await this.livestreamModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!livestream) {
      throw new NotFoundException('Livestream not found');
    }

    const channel = await this.channelModel
      .findById(livestream.channelId)
      .select('_id defaultLiveStreamId');
    if (
      channel &&
      (dto.setAsChannelDefault ||
        (dto.scheduleType === LiveStreamScheduleType.CONTINUOUS &&
          !channel.defaultLiveStreamId))
    ) {
      await this.channelModel.findByIdAndUpdate(channel._id, {
        defaultLiveStreamId: livestream._id,
      });
    }

    return livestream;
  }

  async updateStatus(
    id: string,
    dto: UpdateLivestreamStatusDto,
  ): Promise<LiveStreamDocument> {
    const existing = await this.livestreamModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Livestream not found');
    }

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

    if (
      dto.status === LiveStreamStatus.LIVE &&
      existing.status !== LiveStreamStatus.LIVE
    ) {
      await this.notificationsService.notifyGoLive({
        channelId: livestream.channelId.toString(),
        livestreamId: livestream._id.toString(),
        livestreamTitle: livestream.title,
      });
    }

    return livestream;
  }

  async remove(id: string): Promise<void> {
    const result = await this.livestreamModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Livestream not found');
    }

    await this.channelModel.updateMany(
      { defaultLiveStreamId: result._id },
      { $unset: { defaultLiveStreamId: 1 } },
    );
  }
}

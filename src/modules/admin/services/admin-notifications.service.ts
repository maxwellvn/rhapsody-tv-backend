import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from '../../notifications';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { CreateAnnouncementDto } from '../dto/notifications';

@Injectable()
export class AdminNotificationsService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createAnnouncement(dto: CreateAnnouncementDto) {
    const targetUserIds = dto.userIds?.length
      ? dto.userIds
      : (
          await this.userModel
            .find({ isActive: true })
            .select('_id')
            .lean()
        ).map((user) => user._id.toString());

    const data: Record<string, unknown> = {};
    if (dto.thumbnailUrl) data.thumbnailUrl = dto.thumbnailUrl;
    if (dto.avatarUrl) data.avatarUrl = dto.avatarUrl;
    if (dto.channelId) data.channelId = dto.channelId;
    if (dto.channelSlug) data.channelSlug = dto.channelSlug;
    if (dto.programId) data.programId = dto.programId;
    if (dto.videoId) data.videoId = dto.videoId;
    if (dto.livestreamId) data.livestreamId = dto.livestreamId;

    return this.notificationsService.notifyAnnouncement({
      title: dto.title,
      body: dto.body,
      userIds: targetUserIds,
      data: Object.keys(data).length ? data : undefined,
    });
  }
}

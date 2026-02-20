import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from '../../channel/schemas/channel.schema';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { NotificationsService } from '../../notifications';
import { CreateChannelDto, UpdateChannelDto } from '../dto/channels';

@Injectable()
export class AdminChannelsService {
  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateChannelDto): Promise<ChannelDocument> {
    const existingChannel = await this.channelModel.findOne({
      slug: dto.slug.toLowerCase(),
    });

    if (existingChannel) {
      throw new ConflictException('Channel with this slug already exists');
    }

    const channel = new this.channelModel({
      ...dto,
      slug: dto.slug.toLowerCase(),
    });

    const savedChannel = await channel.save();

    const users = await this.userModel
      .find({ isActive: true })
      .select('_id')
      .lean();
    const userIds = users.map((user) => user._id.toString());

    if (userIds.length > 0) {
      await this.notificationsService.notifyAnnouncement({
        title: 'New channel added',
        body: `${savedChannel.name} is now available on Rhapsody TV`,
        userIds,
        data: {
          event: 'channel_added',
          channelId: savedChannel._id.toString(),
          channelSlug: savedChannel.slug,
          avatarUrl: savedChannel.logoUrl,
          thumbnailUrl: savedChannel.coverImageUrl || savedChannel.logoUrl,
        },
      });
    }

    return savedChannel;
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ channels: ChannelDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [channels, total] = await Promise.all([
      this.channelModel.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.channelModel.countDocuments(),
    ]);

    return {
      channels,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<ChannelDocument> {
    const channel = await this.channelModel.findById(id);

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async update(id: string, dto: UpdateChannelDto): Promise<ChannelDocument> {
    const channel = await this.channelModel.findByIdAndUpdate(
      id,
      { ...dto, slug: dto.slug?.toLowerCase() },
      { new: true, runValidators: true },
    );

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async remove(id: string): Promise<void> {
    const result = await this.channelModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Channel not found');
    }
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from '../../channel/schemas/channel.schema';
import { CreateChannelDto, UpdateChannelDto } from '../dto/channels';
import { AdminNotificationsService } from './admin-notifications.service';

@Injectable()
export class AdminChannelsService {
  private readonly logger = new Logger(AdminChannelsService.name);

  constructor(
    @InjectModel(Channel.name) private channelModel: Model<ChannelDocument>,
    private readonly adminNotificationsService: AdminNotificationsService,
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

    // Send notification to all users about new channel (async, don't wait)
    this.adminNotificationsService.notifyNewChannel(
      savedChannel._id.toString(),
      savedChannel.name,
      savedChannel.description,
      savedChannel.logoUrl,
    ).catch((error) => {
      this.logger.error('Error sending channel notification:', error);
    });

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

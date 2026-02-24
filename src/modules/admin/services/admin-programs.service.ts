import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Program,
  ProgramDocument,
  AnnouncementType,
} from '../../channel/schemas/program.schema';
import { CreateProgramDto, UpdateProgramDto } from '../dto/programs';
import { NotificationsService } from '../../notifications';

const ANNOUNCEMENT_PREFIX_MAP: Record<AnnouncementType, string> = {
  [AnnouncementType.EVENT]: 'New Event',
  [AnnouncementType.PROGRAM]: 'New Program',
  [AnnouncementType.SHOW]: 'New Show',
  [AnnouncementType.SPECIAL]: 'Special Announcement',
};

type ProgramListParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
};

@Injectable()
export class AdminProgramsService {
  constructor(
    @InjectModel(Program.name) private programModel: Model<ProgramDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateProgramDto): Promise<ProgramDocument> {
    const program = new this.programModel({
      channelId: dto.channelId,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      thumbnailUrl: dto.thumbnailUrl,
      announcementType: dto.announcementType,
      isActive: true,
    });

    const saved = await program.save();

    if (saved.isActive) {
      const prefix =
        ANNOUNCEMENT_PREFIX_MAP[saved.announcementType] ?? 'New Program';
      await this.notificationsService.notifyNewProgram({
        channelId: saved.channelId.toString(),
        programId: saved._id.toString(),
        programTitle: saved.title,
        announcementPrefix: prefix,
      });
    }

    return saved;
  }

  async findAll(
    params: ProgramListParams = {},
  ): Promise<{ programs: ProgramDocument[]; total: number; pages: number }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = params;

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 10));
    const skip = (safePage - 1) * safeLimit;

    const filter: Record<string, unknown> = {};
    if (search?.trim()) {
      const value = search.trim();
      filter.$or = [
        { title: { $regex: value, $options: 'i' } },
        { description: { $regex: value, $options: 'i' } },
      ];
    }

    const allowedSortFields = new Set([
      'createdAt',
      'updatedAt',
      'title',
      'announcementType',
    ]);
    const resolvedSortBy = allowedSortFields.has(sortBy) ? sortBy : 'createdAt';
    const resolvedSortOrder = sortOrder === 'desc' ? -1 : 1;

    const [programs, total] = await Promise.all([
      this.programModel
        .find(filter)
        .skip(skip)
        .limit(safeLimit)
        .populate('channelId', 'name slug logoUrl')
        .sort({ [resolvedSortBy]: resolvedSortOrder }),
      this.programModel.countDocuments(filter),
    ]);

    return {
      programs,
      total,
      pages: Math.ceil(total / safeLimit),
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
    const existing = await this.programModel.findById(id);
    if (!existing) {
      throw new NotFoundException('Program not found');
    }

    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.category !== undefined) updateData.category = dto.category;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;
    if (dto.announcementType !== undefined) updateData.announcementType = dto.announcementType;

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

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { User, UserDocument, type UserSettings } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserSettingsDto } from './dto/user-settings.dto';
import { ImageKitService } from '../../shared/services/imagekit/imagekit.service';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type DeepPartial<T extends object> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge<T extends object>(base: T, patch: DeepPartial<T>): T {
  const result = { ...(base as object) } as T;

  for (const key of Object.keys(patch ?? {}) as Array<keyof T>) {
    const value = patch[key];
    if (value === undefined) continue;

    const existing = result[key];

    if (isPlainObject(existing) && isPlainObject(value)) {
      const existingObj: Record<string, unknown> = existing;
      const valueObj: Record<string, unknown> = value;
      const merged = deepMerge(existingObj, valueObj);
      result[key] = merged as unknown as T[typeof key];
    } else {
      result[key] = value as unknown as T[typeof key];
    }
  }

  return result;
}

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly imageKitService: ImageKitService,
    private readonly configService: ConfigService,
  ) {}

  async findOrCreateFromKingsChat(input: {
    kingsChatUserId: string;
    email: string;
    fullName: string;
    kingsChatUsername?: string;
    avatar?: string;
  }): Promise<UserDocument> {
    const normalizedEmail = input.email.toLowerCase();

    let user = await this.userModel.findOne({
      kingsChatUserId: input.kingsChatUserId,
    });

    if (!user) {
      user = await this.userModel.findOne({ email: normalizedEmail });
    }

    if (user) {
      user.fullName = input.fullName;
      user.email = normalizedEmail;
      user.kingsChatUserId = input.kingsChatUserId;
      user.kingsChatUsername = input.kingsChatUsername;
      if (input.avatar && this.shouldAdoptKingsChatAvatar(user.avatar)) {
        user.avatar = input.avatar;
      }
      user.isEmailVerified = true;
      return user.save();
    }

    const generatedPassword = randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(generatedPassword, 12);

    const createdUser = new this.userModel({
      fullName: input.fullName,
      email: normalizedEmail,
      password: hashedPassword,
      kingsChatUserId: input.kingsChatUserId,
      kingsChatUsername: input.kingsChatUsername,
      avatar: input.avatar,
      isEmailVerified: true,
    });

    return createdUser.save();
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email.toLowerCase(),
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const user = new this.userModel({
      ...createUserDto,
      email: createUserDto.email.toLowerCase(),
      password: hashedPassword,
    });

    return user.save();
  }

  async findAll(
    page = 1,
    limit = 10,
  ): Promise<{ users: UserDocument[]; total: number; pages: number }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.userModel.countDocuments(),
    ]);

    return {
      users,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password');
  }

  async findByEmailNoPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isEmailVerified: true,
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedToken = refreshToken
      ? await bcrypt.hash(refreshToken, 12)
      : null;

    await this.userModel.findByIdAndUpdate(userId, {
      refreshToken: hashedToken,
    });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLoginAt: new Date(),
    });
  }

  async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('+refreshToken');

    if (!user || !user.refreshToken) {
      return false;
    }

    return bcrypt.compare(refreshToken, user.refreshToken);
  }

  async getSettings(userId: string): Promise<UserSettings> {
    const user = await this.userModel.findById(userId).select('settings');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.settings;
  }

  async updateSettings(
    userId: string,
    dto: UpdateUserSettingsDto,
  ): Promise<UserSettings> {
    const user = await this.userModel.findById(userId).select('settings');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const merged = deepMerge(user.settings, dto);

    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { settings: merged },
        { new: true, runValidators: true },
      )
      .select('settings');

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated.settings;
  }

  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('Avatar file is required');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are supported');
    }

    const avatarUrl = await this.uploadAvatarFile(file);

    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { avatar: avatarUrl },
        { new: true, runValidators: true },
      )
      .select('avatar');

    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return updated.avatar || avatarUrl;
  }

  private shouldAdoptKingsChatAvatar(existingAvatar?: string): boolean {
    if (!existingAvatar) return true;
    return /^(male|female):\d+$/i.test(existingAvatar);
  }

  private async uploadAvatarFile(file: Express.Multer.File): Promise<string> {
    if (this.isImageKitConfigured()) {
      try {
        const upload = await Promise.race([
          this.imageKitService.uploadFile(file, 'rhapsody-tv/avatars'),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('ImageKit upload timed out')),
              8000,
            ),
          ),
        ]);
        return upload.url;
      } catch {
        // Fall through to local storage fallback for development resilience.
      }
    }

    return this.uploadAvatarToLocal(file);
  }

  private isImageKitConfigured(): boolean {
    const publicKey = this.configService.get<string>('imagekit.publicKey') || '';
    const privateKey =
      this.configService.get<string>('imagekit.privateKey') || '';
    const urlEndpoint =
      this.configService.get<string>('imagekit.urlEndpoint') || '';

    const hasRequiredValues =
      publicKey.trim().length > 0 &&
      privateKey.trim().length > 0 &&
      urlEndpoint.trim().length > 0;

    const hasPlaceholderValues =
      publicKey.startsWith('local_dev_') ||
      privateKey.startsWith('local_dev_') ||
      /local-dev/i.test(urlEndpoint);

    return hasRequiredValues && !hasPlaceholderValues;
  }

  private async uploadAvatarToLocal(file: Express.Multer.File): Promise<string> {
    const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    const rawExt = extname(file.originalname || '').toLowerCase();
    const extension =
      rawExt === '.png' ||
      rawExt === '.jpg' ||
      rawExt === '.jpeg' ||
      rawExt === '.webp' ||
      rawExt === '.gif'
        ? rawExt
        : '.jpg';

    const fileName = `avatar-${Date.now()}-${randomBytes(6).toString('hex')}${extension}`;
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, file.buffer);

    return `/uploads/avatars/${fileName}`;
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

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

  // KingsChat methods
  async findByKingsChatId(kingsChatId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ kingsChatId });
  }

  async linkKingsChatId(userId: string, kingsChatId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { kingsChatId });
  }

  async createFromKingsChat(data: {
    kingsChatId: string;
    fullName: string;
    email?: string;
    avatar?: string;
    username?: string;
  }): Promise<UserDocument> {
    // Check if kingsChatId already exists
    const existingUser = await this.findByKingsChatId(data.kingsChatId);
    if (existingUser) {
      throw new ConflictException('User with this KingsChat ID already exists');
    }

    // Check if email exists (if provided)
    if (data.email) {
      const emailUser = await this.userModel.findOne({
        email: data.email.toLowerCase(),
      });
      if (emailUser) {
        // Link KingsChat to existing account instead
        await this.linkKingsChatId(emailUser._id.toString(), data.kingsChatId);
        return emailUser;
      }
    }

    const user = new this.userModel({
      fullName: data.fullName,
      email: data.email?.toLowerCase(),
      kingsChatId: data.kingsChatId,
      username: data.username,
      avatar: data.avatar,
      isEmailVerified: true, // KingsChat users are considered verified
      isActive: true,
    });

    return user.save();
  }
}

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

  async findByKingschatUsername(kingschatUsername: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ kingschatUsername });
  }

  async findByKingschatId(kingschatId: string): Promise<UserDocument | null> {
    console.log('[UserService] findByKingschatId:', { kingschatId });
    const result = await this.userModel.findOne({ kingschatId });
    console.log('[UserService] findByKingschatId result:', result ? {
      id: result._id.toString(),
      email: result.email,
      kingschatId: result.kingschatId,
      kingschatUsername: result.kingschatUsername,
    } : null);
    return result;
  }

  async findByKingschatUsernameOrEmail(
    username: string,
    email?: string,
  ): Promise<UserDocument | null> {
    // Build conditions - we need to be EXPLICIT to avoid matching documents
    // where kingschatUsername is null/undefined/empty string
    const conditions: Array<Record<string, unknown>> = [];

    // Only match if kingschatUsername is explicitly set to this value (not null/undefined/empty)
    const kcCondition: Record<string, unknown> = {};
    kcCondition.kingschatUsername = username;
    conditions.push(kcCondition);

    if (email) {
      conditions.push({ email: email.toLowerCase() });
    }

    console.log('[UserService] findByKingschatUsernameOrEmail query:', {
      kingschatUsername: username,
      email,
      conditions,
    });

    const result = await this.userModel.findOne({ $or: conditions });

    console.log('[UserService] findByKingschatUsernameOrEmail result:', result ? {
      id: result._id.toString(),
      email: result.email,
      kingschatUsername: result.kingschatUsername,
      fullName: result.fullName,
    } : null);

    return result;
  }

  async createFromKingschat(data: {
    kingschatId: string;  // KingsChat's unique user ID
    email: string;
    fullName: string;
    kingschatUsername: string;
    avatar?: string;
  }): Promise<UserDocument> {
    console.log('[UserService] createFromKingschat called with:', {
      kingschatId: data.kingschatId,
      kingschatUsername: data.kingschatUsername,
      email: data.email,
      fullName: data.fullName,
    });

    // Only match by KingsChat ID - each KingsChat account gets its own user
    const existingUser = await this.findByKingschatId(data.kingschatId);

    console.log('[UserService] Existing user found by kingschatId:', existingUser ? {
      id: existingUser._id.toString(),
      email: existingUser.email,
      kingschatId: existingUser.kingschatId,
      kingschatUsername: existingUser.kingschatUsername,
      fullName: existingUser.fullName,
    } : null);

    if (existingUser) {
      // Update existing user with KingsChat data if missing
      const updates: Partial<Record<string, unknown>> = {};
      if (!existingUser.kingschatId) {
        updates.kingschatId = data.kingschatId;
      }
      if (!existingUser.kingschatUsername) {
        updates.kingschatUsername = data.kingschatUsername;
      }
      if (!existingUser.avatar && data.avatar) {
        updates.avatar = data.avatar;
      }
      if (Object.keys(updates).length > 0) {
        await this.userModel.findByIdAndUpdate(existingUser._id, updates);
        console.log('[UserService] Updated existing user with:', updates);
      }
      console.log('[UserService] Returning existing user');
      return existingUser;
    }

    console.log('[UserService] Creating new user');

    // Generate a random password for KingsChat users
    const randomPassword = await bcrypt.hash(
      Math.random().toString(36).substring(2, 15),
      12,
    );

    // Check if email already exists - if so, generate a unique email for this KingsChat user
    let emailToUse = data.email.toLowerCase();
    const existingEmailUser = await this.findByEmail(emailToUse);
    if (existingEmailUser) {
      // Generate unique email using kingschatId to avoid conflicts
      emailToUse = `${data.kingschatId}@kingschat.user`;
      console.log('[UserService] Email conflict detected, using generated email:', emailToUse);
    }

    try {
      const user = new this.userModel({
        email: emailToUse,
        fullName: data.fullName,
        kingschatId: data.kingschatId,
        kingschatUsername: data.kingschatUsername,
        avatar: data.avatar,
        password: randomPassword,
        isEmailVerified: true, // Auto-verify KingsChat users
        isActive: true,
      });

      const savedUser = await user.save();
      console.log('[UserService] New user created:', {
        id: savedUser._id.toString(),
        email: savedUser.email,
        kingschatId: savedUser.kingschatId,
        kingschatUsername: savedUser.kingschatUsername,
      });

      return savedUser;
    } catch (error: any) {
      console.error('[UserService] Error creating user:', {
        error: error.message,
        code: error.code,
        kingschatId: data.kingschatId,
        email: emailToUse,
      });
      throw error;
    }
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isEmailVerified: true,
    });
  }

  async updatePassword(userId: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.userModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
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
}

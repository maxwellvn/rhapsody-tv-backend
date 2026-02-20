import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import jwtConfig from '../../config/jwt.config';
import kingschatConfig from '../../config/kingschat.config';
import { UserDocument } from '../user/schemas/user.schema';
import { RedisService } from '../../shared/services/redis';

import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
    @Inject(kingschatConfig.KEY)
    private readonly kingsChat: ConfigType<typeof kingschatConfig>,
  ) {}

  private readonly emailVerificationTtlSeconds = 10 * 60;

  private getEmailVerificationKey(email: string): string {
    return `email_verification:${email.toLowerCase()}`;
  }

  private generateEmailVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.userService.findByEmail(email);

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: UserDocument) {
    const tokens = await this.generateTokens(user);

    await this.userService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );
    await this.userService.updateLastLogin(user._id.toString());

    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        username: user.kingsChatUsername,
        avatar: user.avatar,
        gender: user.gender,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async requestEmailVerification(email: string): Promise<{ email: string }> {
    const user = await this.userService.findByEmailNoPassword(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { email: user.email };
    }

    const code = this.generateEmailVerificationCode();
    const key = this.getEmailVerificationKey(user.email);

    await this.redisService.set(key, code, this.emailVerificationTtlSeconds);

    const subject = 'Verify your email address';
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Verify your email address</h2>
        <p>Your verification code is:</p>
        <h1 style="color: #4CAF50; letter-spacing: 5px;">${code}</h1>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      </div>
    `;

    await this.mailService.sendEmail(
      user.email,
      subject,
      htmlBody,
      user.fullName,
    );

    return {
      email: user.email,
    };
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userService.findByEmailNoPassword(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return;
    }

    const key = this.getEmailVerificationKey(user.email);
    const storedCode = await this.redisService.get(key);

    if (!storedCode || storedCode !== code) {
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.userService.markEmailVerified(user._id.toString());
    await this.redisService.del(key);
  }

  async register(registerDto: RegisterDto) {
    const user = await this.userService.create(registerDto);
    const tokens = await this.generateTokens(user);

    await this.userService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );

    // Send verification email (non-blocking - user can request again if it fails)
    try {
      await this.requestEmailVerification(user.email);
    } catch (error) {
      // Log but don't fail registration - user can request verification again
      console.error(
        'Failed to send verification email during registration:',
        error,
      );
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        username: user.kingsChatUsername,
        avatar: user.avatar,
        gender: user.gender,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
      },
      ...tokens,
    };
  }

  async loginWithKingsChat(accessToken: string) {
    const profile = await this.fetchKingsChatProfile(accessToken);

    const userId =
      this.pickString(profile, ['user_id']) ??
      this.pickString(profile, ['userId']) ??
      this.pickString(profile, ['profile', 'user_id']) ??
      this.pickString(profile, ['profile', 'userId']) ??
      this.pickString(profile, ['user', 'user_id']) ??
      this.pickString(profile, ['user', 'userId']) ??
      this.pickString(profile, ['profile', 'user', 'user_id']) ??
      this.pickString(profile, ['profile', 'user', 'userId']) ??
      this.pickString(profile, ['id']) ??
      this.pickString(profile, ['profile', 'id']) ??
      this.pickString(profile, ['user', 'id']) ??
      this.pickString(profile, ['profile', 'user', 'id']);

    if (!userId) {
      throw new UnauthorizedException(
        'KingsChat profile does not include a user identifier',
      );
    }

    const providerEmail =
      this.pickString(profile, ['email']) ??
      this.pickString(profile, ['email', 'address']) ??
      this.pickString(profile, ['profile', 'email']) ??
      this.pickString(profile, ['profile', 'email', 'address']) ??
      this.pickString(profile, ['user', 'email']) ??
      this.pickString(profile, ['user', 'email', 'address']) ??
      this.pickString(profile, ['profile', 'user', 'email']) ??
      this.pickString(profile, ['profile', 'user', 'email', 'address']);

    const safeUserId = userId.toLowerCase().replace(/[^a-z0-9._-]/g, '_');
    const email = providerEmail || `kingschat_${safeUserId}@kingschat.local`;

    const fullName =
      this.pickString(profile, ['full_name']) ??
      this.pickString(profile, ['fullName']) ??
      this.pickString(profile, ['name']) ??
      this.pickString(profile, ['display_name']) ??
      this.pickString(profile, ['profile', 'full_name']) ??
      this.pickString(profile, ['profile', 'fullName']) ??
      this.pickString(profile, ['profile', 'name']) ??
      this.pickString(profile, ['profile', 'display_name']) ??
      this.pickString(profile, ['user', 'full_name']) ??
      this.pickString(profile, ['user', 'fullName']) ??
      this.pickString(profile, ['user', 'name']) ??
      this.pickString(profile, ['profile', 'user', 'full_name']) ??
      this.pickString(profile, ['profile', 'user', 'fullName']) ??
      this.pickString(profile, ['profile', 'user', 'name']) ??
      this.pickString(profile, ['profile', 'user', 'display_name']) ??
      'KingsChat User';

    const kingsChatUsername =
      this.pickString(profile, ['username']) ??
      this.pickString(profile, ['profile', 'username']) ??
      this.pickString(profile, ['user', 'username']) ??
      this.pickString(profile, ['profile', 'user', 'username']) ??
      this.pickString(profile, ['handle']);
    const kingsChatAvatar =
      this.pickString(profile, ['avatar']) ??
      this.pickString(profile, ['avatar_url']) ??
      this.pickString(profile, ['avatarUrl']) ??
      this.pickString(profile, ['profile_picture']) ??
      this.pickString(profile, ['profilePicture']) ??
      this.pickString(profile, ['picture']) ??
      this.pickString(profile, ['photo']) ??
      this.pickString(profile, ['profile', 'avatar']) ??
      this.pickString(profile, ['profile', 'avatar_url']) ??
      this.pickString(profile, ['profile', 'avatarUrl']) ??
      this.pickString(profile, ['profile', 'profile_picture']) ??
      this.pickString(profile, ['profile', 'profilePicture']) ??
      this.pickString(profile, ['user', 'avatar']) ??
      this.pickString(profile, ['user', 'avatar_url']) ??
      this.pickString(profile, ['user', 'avatarUrl']) ??
      this.pickString(profile, ['user', 'profile_picture']) ??
      this.pickString(profile, ['user', 'profilePicture']) ??
      this.pickString(profile, ['profile', 'user', 'avatar']) ??
      this.pickString(profile, ['profile', 'user', 'avatar_url']) ??
      this.pickString(profile, ['profile', 'user', 'avatarUrl']) ??
      this.pickString(profile, ['profile', 'user', 'profile_picture']) ??
      this.pickString(profile, ['profile', 'user', 'profilePicture']) ??
      this.pickString(profile, ['avatar', 'url']) ??
      this.pickString(profile, ['profile', 'avatar', 'url']) ??
      this.pickString(profile, ['user', 'avatar', 'url']) ??
      this.pickString(profile, ['picture', 'url']) ??
      this.pickString(profile, ['photo', 'url']);

    const user = await this.findOrCreateKingsChatUser({
      kingsChatUserId: userId,
      email,
      fullName,
      kingsChatUsername,
      avatar: kingsChatAvatar,
    });

    return this.login(user);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const isValid = await this.userService.validateRefreshToken(
      userId,
      refreshToken,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userService.findById(userId);
    const tokens = await this.generateTokens(user);

    await this.userService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );

    return tokens;
  }

  async logout(userId: string) {
    await this.userService.updateRefreshToken(userId, null);
  }

  private async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      roles: user.roles,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.secret,
        expiresIn: this.parseExpiresIn(this.config.expiresIn),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.refreshSecret,
        expiresIn: this.parseExpiresIn(this.config.refreshExpiresIn),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async findOrCreateKingsChatUser(input: {
    kingsChatUserId: string;
    email: string;
    fullName: string;
    kingsChatUsername?: string;
    avatar?: string;
  }): Promise<UserDocument> {
    const kingsChatUserService = this.userService as unknown as {
      findOrCreateFromKingsChat: (payload: {
        kingsChatUserId: string;
        email: string;
        fullName: string;
        kingsChatUsername?: string;
        avatar?: string;
      }) => Promise<UserDocument>;
    };

    return kingsChatUserService.findOrCreateFromKingsChat(input);
  }

  private async fetchKingsChatProfile(
    accessToken: string,
  ): Promise<Record<string, unknown>> {
    const profileUrls = Array.from(
      new Set([
        this.kingsChat.profileUrl,
        'https://connect.kingsch.at/api/profile',
        'https://connect.kingsch.at/api/v1/users/me',
      ]),
    );

    for (const profileUrl of profileUrls) {
      try {
        const response = await axios.get(profileUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: this.kingsChat.requestTimeoutMs,
          validateStatus: () => true,
        });

        if (response.status >= 200 && response.status < 300) {
          if (!response.data || typeof response.data !== 'object') {
            continue;
          }
          return response.data as Record<string, unknown>;
        }

        this.logger.warn(
          `KingsChat profile fetch failed (${response.status}) at ${profileUrl}`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `KingsChat profile fetch error at ${profileUrl}: ${message}`,
        );
      }
    }

    throw new UnauthorizedException('Invalid KingsChat access token');
  }

  private pickString(
    source: Record<string, unknown>,
    path: string[],
  ): string | undefined {
    const value = this.pickValue(source, path);
    return typeof value === 'string' && value.trim().length > 0
      ? value.trim()
      : undefined;
  }

  private pickValue(source: unknown, path: string[]): unknown {
    let current: unknown = source;

    for (const segment of path) {
      if (!current || typeof current !== 'object') {
        return undefined;
      }

      current = (current as Record<string, unknown>)[segment];
    }

    return current;
  }

  private parseExpiresIn(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour in seconds
    }

    const num = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 3600;
    }
  }
}

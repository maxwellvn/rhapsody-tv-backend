import {
  Injectable,
  UnauthorizedException,
  Inject,
  ForbiddenException,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
import { KingsChatLoginDto } from './dto/kingschat-login.dto';
import jwtConfig from '../../config/jwt.config';
import { UserDocument } from '../user/schemas/user.schema';
import { RedisService } from '../../shared/services/redis';
import { EmailService } from '../../shared/services/email';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
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

    if (!user || !user.password) {
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
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        username: user.username,
      },
      ...tokens,
    };
  }

  async requestEmailVerification(email: string): Promise<{ email: string }> {
    const user = await this.userService.findByEmailNoPassword(email);

    if (!user || !user.email) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      return { email: user.email };
    }

    const code = this.generateEmailVerificationCode();
    const key = this.getEmailVerificationKey(user.email);

    await this.redisService.set(key, code, this.emailVerificationTtlSeconds);

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(user.email, code);
      this.logger.log(`Verification email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${user.email}:`, error);
      // Continue even if email fails - code is still stored in Redis
    }

    return {
      email: user.email,
    };
  }

  async verifyEmail(email: string, code: string): Promise<void> {
    const user = await this.userService.findByEmailNoPassword(email);

    if (!user || !user.email) {
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

    // Send verification email after registration (fire and forget - don't block response)
    if (user.email) {
      const code = this.generateEmailVerificationCode();
      const key = this.getEmailVerificationKey(user.email);
      const userEmail = user.email;
      this.redisService.set(key, code, this.emailVerificationTtlSeconds)
        .then(() => this.emailService.sendVerificationEmail(userEmail, code))
        .then(() => this.logger.log(`Verification email sent to ${userEmail} after registration`))
        .catch((error) => this.logger.error(`Failed to send verification email to ${userEmail}:`, error));
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        username: user.username,
      },
      ...tokens,
    };
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

  /**
   * Login or register user via KingsChat OAuth
   */
  async loginWithKingsChat(kingsChatLoginDto: KingsChatLoginDto) {
    const { accessToken } = kingsChatLoginDto;

    // Fetch user profile from KingsChat API
    const kingsChatProfile = await this.fetchKingsChatProfile(accessToken);

    if (!kingsChatProfile || !kingsChatProfile.id) {
      this.logger.error('Failed to fetch KingsChat profile');
      throw new BadRequestException('Failed to fetch KingsChat profile');
    }

    // Check if user already exists with this KingsChat ID
    let user = await this.userService.findByKingsChatId(kingsChatProfile.id);

    if (!user) {
      // Check if user exists with the same email (if email is provided)
      if (kingsChatProfile.email) {
        user = await this.userService.findByEmail(kingsChatProfile.email);
        if (user) {
          // Link KingsChat ID to existing account
          await this.userService.linkKingsChatId(user._id.toString(), kingsChatProfile.id);
        }
      }

      // Create new user if not found
      if (!user) {
        user = await this.userService.createFromKingsChat({
          kingsChatId: kingsChatProfile.id,
          fullName: kingsChatProfile.displayName || kingsChatProfile.username,
          email: kingsChatProfile.email,
          avatar: kingsChatProfile.avatar,
          username: kingsChatProfile.username,
        });
      }
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

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
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
      },
      ...tokens,
    };
  }

  /**
   * Fetch user profile from KingsChat API
   */
  private async fetchKingsChatProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatar?: string;
  } | null> {
    try {
      const response = await fetch('https://connect.kingsch.at/api/profile', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        this.logger.error(`KingsChat API error: ${response.status}`);
        const errorText = await response.text();
        this.logger.error(`KingsChat API response: ${errorText}`);
        return null;
      }

      const data = await response.json();

      // KingsChat returns profile in nested format: { profile: { user: {...}, email: {...} } }
      const profileData = data.profile || data;
      const user = profileData.user || profileData;
      const emailData = profileData.email || {};

      return {
        id: user.user_id || user.id || user.userId,
        username: user.username || user.user_name,
        displayName: user.name || user.display_name || user.displayName || user.full_name || user.username,
        email: typeof emailData === 'object' ? emailData.address : emailData,
        avatar: user.avatar_url || user.avatar || user.profile_picture || user.profilePicture || user.image,
      };
    } catch (error) {
      this.logger.error('Failed to fetch KingsChat profile:', error);
      return null;
    }
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

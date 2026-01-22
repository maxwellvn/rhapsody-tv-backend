import {
  Injectable,
  UnauthorizedException,
  Inject,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { ConfigType } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { RegisterDto } from './dto/register.dto';
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

    // Send verification email after registration
    try {
      const code = this.generateEmailVerificationCode();
      const key = this.getEmailVerificationKey(user.email);
      await this.redisService.set(key, code, this.emailVerificationTtlSeconds);
      await this.emailService.sendVerificationEmail(user.email, code);
      this.logger.log(`Verification email sent to ${user.email} after registration`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${user.email}:`, error);
    }

    return {
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
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

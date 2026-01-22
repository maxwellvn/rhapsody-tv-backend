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
  private readonly passwordResetTtlSeconds = 60 * 60; // 1 hour

  private getEmailVerificationKey(email: string): string {
    return `email_verification:${email.toLowerCase()}`;
  }

  private getPasswordResetKey(email: string): string {
    return `password_reset:${email.toLowerCase()}`;
  }

  private generateEmailVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private generateResetToken(): string {
    // Generate a random 32-byte hex string (64 characters)
    return Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
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

  /**
   * Authenticate user with KingsChat OAuth token
   * Fetches user profile from KingsChat API and creates/updates user
   */
  async loginWithKingschat(accessToken: string) {
    // Fetch user profile from KingsChat API
    const kingsChatApiUrl = process.env.KINGSCHAT_API_URL || 'https://connect.kingsch.at/api/profile';

    this.logger.log('[KingsChat] Fetching profile from:', { url: kingsChatApiUrl });

    let kingsChatProfile: {
      id: string;
      username: string;
      email?: string;
      first_name?: string;
      last_name?: string;
      display_name?: string;
      avatar?: string;
      country?: string;
    };

    try {
      const response = await fetch(kingsChatApiUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      this.logger.log('[KingsChat] API Response status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('[KingsChat] API Error Response:', {
          status: response.status,
          body: errorText,
        });
        throw new UnauthorizedException('Failed to authenticate with KingsChat');
      }

      const responseText = await response.text();
      this.logger.log('[KingsChat] Raw API Response:', responseText.substring(0, 500));

      const rawProfile = JSON.parse(responseText);
      
      // Log full raw response to see actual field names
      this.logger.log('[KingsChat] Full raw profile:', JSON.stringify(rawProfile));

      // KingsChat API may return data in different formats - handle both
      // The profile might be nested under a 'data' or 'user' key
      const profileData = rawProfile.data || rawProfile.user || rawProfile;
      
      // Map to our expected format - try multiple possible field names
      kingsChatProfile = {
        id: profileData.id || profileData.user_id || profileData.userId || profileData.kingschat_id,
        username: profileData.username || profileData.user_name || profileData.userName,
        email: profileData.email || profileData.email_address,
        first_name: profileData.first_name || profileData.firstName || profileData.given_name,
        last_name: profileData.last_name || profileData.lastName || profileData.family_name,
        display_name: profileData.display_name || profileData.displayName || profileData.name || profileData.full_name || profileData.fullName,
        avatar: profileData.avatar || profileData.avatar_url || profileData.avatarUrl || profileData.profile_picture || profileData.picture,
      };

      // Log KingsChat profile for debugging
      this.logger.log('[KingsChat] Profile fetched:', {
        id: kingsChatProfile.id,
        username: kingsChatProfile.username,
        email: kingsChatProfile.email,
        displayName: kingsChatProfile.display_name,
        firstName: kingsChatProfile.first_name,
        lastName: kingsChatProfile.last_name,
      });
    } catch (error) {
      this.logger.error('KingsChat API error:', error);
      throw new UnauthorizedException('Failed to authenticate with KingsChat');
    }

    // Create or get user from KingsChat data
    // Ensure fullName is never empty - use multiple fallbacks
    const fullName =
      kingsChatProfile.display_name ||
      [kingsChatProfile.first_name, kingsChatProfile.last_name]
        .filter(Boolean)
        .join(' ') ||
      kingsChatProfile.username ||
      `KingsChat User ${kingsChatProfile.id}`;

    this.logger.log('[KingsChat] Looking up/creating user:', {
      kingschatId: kingsChatProfile.id,
      kingschatUsername: kingsChatProfile.username,
      email: kingsChatProfile.email || `${kingsChatProfile.username}@kingschat.user`,
      fullName,
    });

    const user = await this.userService.createFromKingschat({
      kingschatId: kingsChatProfile.id,  // Use KingsChat's unique ID
      email:
        kingsChatProfile.email ||
        `${kingsChatProfile.username}@kingschat.user`,
      fullName,
      kingschatUsername: kingsChatProfile.username,
      avatar: kingsChatProfile.avatar,
    });

    this.logger.log('[KingsChat] User found/created:', {
      userId: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      kingschatUsername: user.kingschatUsername,
    });

    // Check if user is active
    if (!user.isActive) {
      throw new ForbiddenException('Account is deactivated');
    }

    const tokens = await this.generateTokens(user);

    await this.userService.updateRefreshToken(
      user._id.toString(),
      tokens.refreshToken,
    );
    await this.userService.updateLastLogin(user._id.toString());

    const result = {
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        kingschatId: user.kingschatId,
        kingschatUsername: user.kingschatUsername,
        avatar: user.avatar,
      },
      ...tokens,
    };

    this.logger.log('[KingsChat] Returning auth response:', {
      userId: result.user.id,
      kingschatId: result.user.kingschatId,
      email: result.user.email,
      fullName: result.user.fullName,
    });

    return result;
  }

  /**
   * Request password reset
   * Generates a reset token and sends it via email
   * Always returns success to prevent email enumeration
   */
  async forgotPassword(email: string): Promise<{ email?: string; resetToken?: string; message: string }> {
    const user = await this.userService.findByEmailNoPassword(email);

    if (!user) {
      // Return success even if user doesn't exist (prevent email enumeration)
      return {
        message: 'If an account with that email exists, a reset link has been sent',
      };
    }

    const resetToken = this.generateResetToken();
    const emailKey = this.getPasswordResetKey(user.email);
    const tokenKey = `password_reset_token:${resetToken}`;

    // Store both mappings for efficient lookup
    await this.redisService.set(emailKey, resetToken, this.passwordResetTtlSeconds);
    await this.redisService.set(tokenKey, user.email, this.passwordResetTtlSeconds);

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${user.email}:`, error);
      // Continue - token is still stored in Redis
    }

    return {
      email: user.email,
      resetToken: resetToken, // Remove in production
      message: 'If an account with that email exists, a reset link has been sent',
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find the reset token in Redis
    const tokenKey = `password_reset_token:${token}`;
    const email = await this.redisService.get(tokenKey);

    if (!email) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.userService.findByEmailNoPassword(email as string);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user password
    await this.userService.updatePassword(user._id.toString(), newPassword);

    // Delete the reset token
    await this.redisService.del(tokenKey);
    await this.redisService.del(this.getPasswordResetKey(user.email));

    // Clear all refresh tokens for security
    await this.userService.updateRefreshToken(user._id.toString(), null);

    this.logger.log(`Password reset successful for ${user.email}`);
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

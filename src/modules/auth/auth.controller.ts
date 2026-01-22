import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import type { UserDocument } from '../user/schemas/user.schema';
import {
  ApiCreatedSuccessResponse,
  ApiOkSuccessResponse,
} from '../../common/swagger';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthLoginResponseDto,
  AuthTokensDto,
  EmailOnlyResponseDto,
  RequestEmailVerificationDto,
  VerifyEmailDto,
} from './dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public, CurrentUser } from '../../common/decorators';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedSuccessResponse({
    description: 'User registered successfully',
    model: AuthLoginResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      message: 'User registered successfully',
      data: result,
    };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiOkSuccessResponse({
    description: 'Login successful',
    model: AuthLoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Req() req: Request & { user: UserDocument }) {
    const result = await this.authService.login(req.user);
    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  @Public()
  @Post('email/request-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request email verification code' })
  @ApiOkSuccessResponse({
    description: 'Verification code requested',
    model: EmailOnlyResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async requestEmailVerification(
    @Body() requestDto: RequestEmailVerificationDto,
  ) {
    const result = await this.authService.requestEmailVerification(
      requestDto.email,
    );

    return {
      success: true,
      message: 'Verification code requested',
      data: result,
    };
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email using 6 digit code' })
  @ApiOkSuccessResponse({ description: 'Email verified successfully' })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification code',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    await this.authService.verifyEmail(
      verifyEmailDto.email,
      verifyEmailDto.code,
    );

    return {
      success: true,
      message: 'Email verified successfully',
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkSuccessResponse({
    description: 'Token refreshed successfully',
    model: AuthTokensDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto) {
    // Decode the refresh token to get the user ID
    // This is a simplified version - in production, you'd want more validation
    const parsedPayload: unknown = JSON.parse(
      Buffer.from(
        refreshTokenDto.refreshToken.split('.')[1],
        'base64',
      ).toString(),
    );

    if (!parsedPayload || typeof parsedPayload !== 'object') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = parsedPayload as Record<string, unknown>;
    const userId = payload.sub;

    if (typeof userId !== 'string') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.authService.refreshTokens(
      userId,
      refreshTokenDto.refreshToken,
    );

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: tokens,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiOkSuccessResponse({ description: 'Logout successful' })
  async logout(@CurrentUser() user: UserDocument) {
    await this.authService.logout(user._id.toString());
    return {
      success: true,
      message: 'Logout successful',
    };
  }
}

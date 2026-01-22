import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Query,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiExcludeEndpoint,
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
  KingsChatLoginDto,
} from './dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Public, CurrentUser } from '../../common/decorators';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

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
  @Post('kingschat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or register with KingsChat' })
  @ApiBody({ type: KingsChatLoginDto })
  @ApiOkSuccessResponse({
    description: 'KingsChat login successful',
    model: AuthLoginResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Failed to fetch KingsChat profile' })
  async loginWithKingsChat(@Body() kingsChatLoginDto: KingsChatLoginDto) {
    const result = await this.authService.loginWithKingsChat(kingsChatLoginDto);
    return {
      success: true,
      message: 'KingsChat login successful',
      data: result,
    };
  }

  /**
   * KingsChat OAuth callback endpoint
   * Receives POST with token from KingsChat and redirects to mobile app
   */
  @Public()
  @Post('kingschat/callback')
  @ApiExcludeEndpoint()
  async kingsChatCallback(
    @Body() body: any,
    @Query('app_redirect') appRedirect: string,
    @Res() res: Response,
  ) {
    const accessToken = body?.accessToken || body?.access_token;
    const refreshToken = body?.refreshToken || body?.refresh_token;
    const expiresIn = body?.expiresInMillis || body?.expires_in_millis || body?.expires_in;

    if (!accessToken) {
      const errorRedirect = `${appRedirect}?error=no_token`;
      return res.redirect(errorRedirect);
    }

    const params = new URLSearchParams({ access_token: accessToken });

    if (refreshToken) {
      params.append('refresh_token', refreshToken);
    }

    if (expiresIn) {
      params.append('expires_in_millis', String(expiresIn));
    }

    return res.redirect(`${appRedirect}?${params.toString()}`);
  }

  /**
   * KingsChat OAuth callback endpoint (GET fallback)
   */
  @Public()
  @Get('kingschat/callback')
  @ApiExcludeEndpoint()
  async kingsChatCallbackGet(
    @Query() query: any,
    @Res() res: Response,
  ) {
    this.logger.log('KingsChat callback GET received');
    this.logger.log('Query:', JSON.stringify(query));

    const appRedirect = query.app_redirect;
    const accessToken = query.accessToken || query.access_token;
    const refreshToken = query.refreshToken || query.refresh_token;
    const expiresIn = query.expiresInMillis || query.expires_in_millis || query.expires_in;

    if (!accessToken) {
      this.logger.error('No access token in callback query');
      if (appRedirect) {
        return res.redirect(`${appRedirect}?error=no_token`);
      }
      return res.status(400).json({ error: 'No access token received' });
    }

    if (!appRedirect) {
      return res.status(400).json({ error: 'No app_redirect specified' });
    }

    // Build redirect URL with tokens
    const params = new URLSearchParams({
      access_token: accessToken,
    });

    if (refreshToken) {
      params.append('refresh_token', refreshToken);
    }

    if (expiresIn) {
      params.append('expires_in_millis', String(expiresIn));
    }

    const redirectUrl = `${appRedirect}?${params.toString()}`;
    this.logger.log('Redirecting to:', redirectUrl);

    return res.redirect(redirectUrl);
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

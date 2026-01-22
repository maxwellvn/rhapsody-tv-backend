import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class KingsChatCallbackController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Handle GET requests for the callback
   * KingsChat may send GET requests with tokens in query params
   */
  @Public()
  @Get('kingschat-callback')
  public handleGetCallback(@Query() query: Record<string, string>, @Res() res: Response) {
    const accessToken = query.accessToken || query.access_token || null;
    const refreshToken = query.refreshToken || query.refresh_token || null;
    const error = query.error || null;

    return this.sendHtmlResponse(res, accessToken, refreshToken, error);
  }

  /**
   * Handle POST requests for the callback
   * KingsChat sends POST requests with tokens in form data when using post_redirect=true
   */
  @Public()
  @Post('kingschat-callback')
  public async handlePostCallback(@Req() req: Request, @Res() res: Response) {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;
    let error: string | null = null;

    const contentType = req.headers['content-type'] || '';

    try {
      if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse form data from body
        const body = req.body as Record<string, string>;
        accessToken = body.accessToken || body.access_token || null;
        refreshToken = body.refreshToken || body.refresh_token || null;
        error = body.error || null;
      } else if (contentType.includes('application/json')) {
        // Parse JSON body
        const body = req.body as Record<string, string>;
        accessToken = body.accessToken || body.access_token || null;
        refreshToken = body.refreshToken || body.refresh_token || null;
        error = body.error || null;
      } else {
        // Try to parse as form data as fallback
        const body = req.body as Record<string, string>;
        accessToken = body.accessToken || body.access_token || null;
        refreshToken = body.refreshToken || body.refresh_token || null;
        error = body.error || null;
      }
    } catch (err) {
      error = 'Failed to process authentication';
    }

    return this.sendHtmlResponse(res, accessToken, refreshToken, error);
  }

  /**
   * Generate HTML response that redirects to the mobile app via deep link
   */
  private sendHtmlResponse(
    res: Response,
    accessToken: string | null,
    refreshToken: string | null,
    error: string | null,
  ): Response {
    const appScheme = this.configService.get<string>('APP_SCHEME') || 'rhapsodytv';

    // Build deep link URL
    let deepLink = `${appScheme}://auth/callback`;
    const params = new URLSearchParams();

    if (error) {
      params.append('status', 'error');
      params.append('error', error);
    } else if (accessToken) {
      params.append('accessToken', accessToken);
      if (refreshToken) {
        params.append('refreshToken', refreshToken);
      }
    }

    if (params.toString()) {
      deepLink += `?${params.toString()}`;
    }

    const html = this.buildRedirectHtml(deepLink, !!error);

    return res.status(200).type('html').send(html);
  }

  /**
   * Build HTML page for redirect
   */
  private buildRedirectHtml(deepLink: string, isError: boolean): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Redirecting...</title>
</head>
<body>
  <script>
    // Immediate redirect - execute before page renders
    window.location.replace("${deepLink}");
  </script>
</body>
</html>
`;
  }
}

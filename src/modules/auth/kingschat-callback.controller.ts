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
      params.append('status', 'success');
      params.append('accessToken', accessToken);
      if (refreshToken) {
        params.append('refreshToken', refreshToken);
      }
    } else {
      // No token received
      params.append('status', 'error');
      params.append('error', 'No token received');
    }

    if (params.toString()) {
      deepLink += `?${params.toString()}`;
    }

    const html = this.buildRedirectHtml(deepLink, !!error || !accessToken);

    return res.status(200).type('html').send(html);
  }

  /**
   * Build HTML page for redirect with fallback button
   */
  private buildRedirectHtml(deepLink: string, isError: boolean): string {
    const title = isError ? 'Authentication Failed' : 'Authentication Successful';
    const message = isError 
      ? 'There was a problem signing in. Please try again.'
      : 'Redirecting you back to the app...';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255,255,255,0.3);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h2 { margin-bottom: 10px; }
    p { color: rgba(255,255,255,0.7); }
    .btn {
      display: inline-block;
      margin-top: 20px;
      padding: 12px 30px;
      background: #3b82f6;
      color: white;
      text-decoration: none;
      border-radius: 25px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    ${!isError ? '<div class="spinner"></div>' : ''}
    <h2>${title}</h2>
    <p>${message}</p>
    <a href="${deepLink}" class="btn">
      ${isError ? 'Try Again' : 'Open App'}
    </a>
  </div>
  <script>
    // Auto-redirect to the app
    window.location.href = ${JSON.stringify(deepLink)};
    
    // Fallback: try again after a short delay
    setTimeout(function() {
      window.location.href = ${JSON.stringify(deepLink)};
    }, 1000);
  </script>
</body>
</html>
`;
  }
}

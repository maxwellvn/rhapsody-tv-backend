import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class KingsChatCallbackController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Handle GET requests for the callback
   * KingsChat may send GET requests with tokens in query params
   */
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
  <title>${isError ? 'Authentication Failed' : 'Redirecting...'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #0000FF 0%, #00008B 100%);
      color: white;
    }
    .container {
      text-align: center;
      padding: 40px 20px;
      max-width: 400px;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 30px;
      line-height: 1.5;
    }
    .btn {
      display: inline-block;
      background: white;
      color: #0000FF;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .logo {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .error {
      color: #FFD700;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">📺</div>
    ${isError ? '<h1 class="error">Authentication Failed</h1>' : '<div class="spinner"></div><h1>Authentication Successful</h1>'}
    <p>${isError ? 'There was a problem signing in with KingsChat. Please try again.' : 'Redirecting to the Rhapsody TV app...'}</p>
    <a href="${deepLink}" class="btn">Open App</a>
  </div>
  <script>
    // Try to redirect immediately
    window.location.href = "${deepLink}";

    // Fallback: show error if redirect doesn't work after 2 seconds
    setTimeout(function() {
      if (window.location.href.indexOf('${deepLink.split('?')[0]}') === -1) {
        document.querySelector('.spinner')?.style.display = 'none';
      }
    }, 2000);
  </script>
</body>
</html>
`;
  }
}

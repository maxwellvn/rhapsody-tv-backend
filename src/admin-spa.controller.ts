import { Controller, Get, Res, Req } from '@nestjs/common';
import type { Response, Request } from 'express';
import { join } from 'path';
import { Public } from './common/decorators';

@Controller('admin')
export class AdminSpaController {
  @Public()
  @Get('*')
  serveAdmin(@Req() req: Request, @Res() res: Response) {
    // If the request has a file extension (like .js, .css), let serve-static handle it
    if (req.path.includes('.')) {
      return res.sendFile(join(__dirname, '..', 'public', 'admin', req.path.replace('/admin', '')));
    }
    // For all other routes, serve index.html (SPA routing)
    return res.sendFile(join(__dirname, '..', 'public', 'admin', 'index.html'));
  }
}

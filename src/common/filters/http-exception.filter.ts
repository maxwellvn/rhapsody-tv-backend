import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly configService: ConfigService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;

        const msg = responseObj.message;
        if (typeof msg === 'string') {
          message = msg;
        }

        if ('errors' in responseObj) {
          errors = responseObj.errors;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    await this.sendToDiscord({
      status,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      stack: exception instanceof Error ? exception.stack : undefined,
      errors,
    });

    response.status(status).json({
      success: false,
      statusCode: status,
      message,
      errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private async sendToDiscord(payload: {
    status: number;
    message: string;
    path: string;
    method: string;
    timestamp: string;
    stack?: string;
    errors: unknown;
  }) {
    const webhookUrl = this.configService.get<string>('app.discordWebhookUrl');
    if (!webhookUrl) {
      return;
    }

    const { status, message, path, method, timestamp, stack, errors } = payload;
    const content = [
      `**Server Error**`,
      `Status: ${status}`,
      `Message: ${message}`,
      `Path: ${method} ${path}`,
      `Time: ${timestamp}`,
      stack ? `Stack: ${'```'}${stack}${'```'}` : null,
      errors
        ? `Errors: ${'```json'}\n${JSON.stringify(errors, null, 2)}\n${'```'}`
        : null,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });
    } catch (err) {
      this.logger.error(
        'Failed to send Discord webhook',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { join } from 'path';
import { static as expressStatic } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { existsSync } from 'fs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Security - configure helmet to work with admin SPA
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disable CSP for admin app compatibility
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );

  // Serve Admin SPA at /admin (before other routes)
  const adminPath = join(__dirname, '..', 'public', 'admin');
  if (existsSync(adminPath)) {
    // Serve static assets
    app.use('/admin', expressStatic(adminPath));
    
    // SPA fallback - serve index.html for all /admin/* routes that don't match a file
    // Express 5 uses {*path} syntax instead of * for wildcards
    app.use('/admin/{*path}', (req: Request, res: Response, next: NextFunction) => {
      const indexPath = join(adminPath, 'index.html');
      if (existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        next();
      }
    });
    
    logger.log('Admin SPA configured at /admin');
  }

  // CORS
  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? process.env.CORS_ORIGIN?.split(',') || []
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix - only exclude health route (admin API stays under v1)
  app.setGlobalPrefix('v1', {
    exclude: ['health'],
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Rhapsody TV API')
      .setDescription('Rhapsody TV Backend API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Authentication', 'Auth endpoints')
      .addTag('Users', 'User management endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('v1/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });

    logger.log(
      `Swagger documentation available at http://localhost:${port}/v1/docs`,
    );
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);
}

void bootstrap();

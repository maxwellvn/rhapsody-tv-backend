import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, type Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { AppModule } from './app.module';
import { AuthModule } from './modules/auth';
import { UserModule } from './modules/user';
import { ChannelModule } from './modules/channel';
import { HomepageModule } from './modules/homepage';
import { VodModule } from './modules/vod';
import { NotificationsModule } from './modules/notifications';
import { StreamModule } from './modules/stream';
import { AdminModule } from './modules/admin/admin.module';
import { MailModule } from './modules/mail/mail.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port', 3000);
  const nodeEnv = configService.get<string>('app.nodeEnv', 'development');

  // Security
  app.use(helmet());

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

  // Global prefix
  app.setGlobalPrefix('v1');

  // Serve local uploads in development/fallback mode.
  const uploadsRoot = join(process.cwd(), 'uploads');
  await mkdir(join(uploadsRoot, 'avatars'), { recursive: true });
  app.useStaticAssets(uploadsRoot, { prefix: '/uploads' });

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

    const setupModuleDocs = (
      path: string,
      title: string,
      description: string,
      include: Type<unknown>[],
    ) => {
      const moduleConfig = new DocumentBuilder()
        .setTitle(title)
        .setDescription(description)
        .setVersion('1.0')
        .addBearerAuth()
        .build();

      const moduleDocument = SwaggerModule.createDocument(app, moduleConfig, {
        include,
        deepScanRoutes: false,
      });

      const moduleDocsPath = `v1/docs/${path}`;
      SwaggerModule.setup(moduleDocsPath, app, moduleDocument, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });

      logger.log(
        `Swagger ${path} documentation available at http://localhost:${port}/${moduleDocsPath}`,
      );
      logger.log(
        `Swagger ${path} JSON documentation available at http://localhost:${port}/${moduleDocsPath}-json`,
      );
    };

    setupModuleDocs('auth', 'Rhapsody TV API - Auth', 'Auth endpoints', [
      AuthModule,
    ]);
    setupModuleDocs('users', 'Rhapsody TV API - Users', 'User endpoints', [
      UserModule,
    ]);
    setupModuleDocs('admin', 'Rhapsody TV API - Admin', 'Admin endpoints', [
      AdminModule,
    ]);
    setupModuleDocs(
      'channel',
      'Rhapsody TV API - Channels',
      'Channel endpoints',
      [ChannelModule],
    );
    setupModuleDocs('vod', 'Rhapsody TV API - VOD', 'VOD endpoints', [
      VodModule,
    ]);
    setupModuleDocs(
      'notifications',
      'Rhapsody TV API - Notifications',
      'Notification endpoints',
      [NotificationsModule],
    );
    setupModuleDocs(
      'homepage',
      'Rhapsody TV API - Homepage',
      'Homepage endpoints',
      [HomepageModule],
    );
    setupModuleDocs('stream', 'Rhapsody TV API - Stream', 'Stream endpoints', [
      StreamModule,
    ]);
    setupModuleDocs('mail', 'Rhapsody TV API - Mail', 'Mail endpoints', [
      MailModule,
    ]);

    logger.log(
      `Swagger documentation available at http://localhost:${port}/v1/docs`,
    );
    logger.log(
      `Swagger JSON documentation available at http://localhost:${port}/v1/docs-json`,
    );
  }

  await app.listen(port, '0.0.0.0');
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Environment: ${nodeEnv}`);
}

void bootstrap();

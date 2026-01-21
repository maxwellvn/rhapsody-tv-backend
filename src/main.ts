import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

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

  // Global prefix - exclude admin and health routes
  app.setGlobalPrefix('v1', {
    exclude: ['health', 'admin', 'admin/(.*)'],
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

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { join } from 'path';

// Config
import {
  appConfig,
  databaseConfig,
  redisConfig,
  jwtConfig,
  imagekitConfig,
  emailConfig,
} from './config';

// Common
import { HttpExceptionFilter } from './common/filters';
import { JwtAuthGuard, RolesGuard } from './common/guards';

// Shared
import { RedisModule } from './shared/services/redis';
import { ImageKitModule } from './shared/services/imagekit';

// Modules
import { UserModule } from './modules/user';
import { AuthModule } from './modules/auth';
import { AdminModule } from './modules/admin/admin.module';
import { HomepageModule } from './modules/homepage';
import { VodModule } from './modules/vod';
import { NotificationModule } from './modules/notification/notification.module';

// Controllers
import { HealthController } from './health.controller';
import { AdminSpaController } from './admin-spa.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, imagekitConfig, emailConfig],
      envFilePath: ['.env', '.env.local'],
    }),

    // Serve Admin App static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public', 'admin'),
      serveRoot: '/admin',
      serveStaticOptions: {
        index: ['index.html'],
        fallthrough: true,
      },
    }),

    // Database
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),

    // Shared Modules
    RedisModule,
    ImageKitModule,

    // Feature Modules
    AuthModule,
    UserModule,
    AdminModule,
    HomepageModule,
    VodModule,
    NotificationModule,
  ],
  controllers: [HealthController, AdminSpaController],
  providers: [
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // Global JWT Auth Guard
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Global Roles Guard
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}

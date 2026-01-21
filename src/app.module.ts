import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

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
import { VideoProbeModule } from './shared/services/video-probe';

// Modules
import { UserModule } from './modules/user';
import { AuthModule } from './modules/auth';
import { AdminModule } from './modules/admin/admin.module';
import { HomepageModule } from './modules/homepage';
import { VodModule } from './modules/vod';
import { NotificationModule } from './modules/notification/notification.module';

// Controllers
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, imagekitConfig, emailConfig],
      envFilePath: ['.env', '.env.local'],
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
    VideoProbeModule,

    // Feature Modules
    AuthModule,
    UserModule,
    AdminModule,
    HomepageModule,
    VodModule,
    NotificationModule,
  ],
  controllers: [HealthController],
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

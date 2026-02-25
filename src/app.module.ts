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
  kingschatConfig,
  stripeConfig,
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
import { ChannelModule } from './modules/channel';
import { NotificationsModule } from './modules/notifications';
import { MailModule } from './modules/mail/mail.module';
import { VideosModule } from './modules/videos';
import { DonationsModule } from './modules/donations';
import { SyncModule } from './modules/sync';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        imagekitConfig,
        kingschatConfig,
        stripeConfig,
      ],
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

    // Feature Modules
    AuthModule,
    UserModule,
    AdminModule,
    ChannelModule,
    NotificationsModule,
    HomepageModule,
    VideosModule,
    VodModule,
    MailModule,
    DonationsModule,
    SyncModule,
  ],
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

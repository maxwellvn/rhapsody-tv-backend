import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../../../shared/enums/role.enum';

export type UserDocument = HydratedDocument<User>;

export type UserSettings = {
  general: {
    appLanguage: string;
    autoRotateScreen: boolean;
  };
  notifications: {
    subscriptions: boolean;
    recommendedVideos: boolean;
    activityOnMyComments: boolean;
  };
  quality: {
    videoQualityMobile: string;
    videoQualityWifi: string;
    audioQuality: string;
  };
  downloads: {
    downloadQuality: string;
    downloadOverWifiOnly: boolean;
  };
};

const defaultUserSettings: UserSettings = {
  general: {
    appLanguage: 'en',
    autoRotateScreen: false,
  },
  notifications: {
    subscriptions: true,
    recommendedVideos: true,
    activityOnMyComments: true,
  },
  quality: {
    videoQualityMobile: 'auto',
    videoQualityWifi: 'auto',
    audioQuality: 'auto',
  },
  downloads: {
    downloadQuality: 'medium',
    downloadOverWifiOnly: false,
  },
};

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, trim: true })
  fullName: string;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ trim: true })
  kingsChatUserId?: string;

  @Prop({ trim: true })
  kingsChatUsername?: string;

  @Prop({ trim: true })
  avatar?: string;

  @Prop({ enum: ['male', 'female'] })
  gender?: 'male' | 'female';

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles: Role[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop()
  refreshToken?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({
    type: {
      general: {
        appLanguage: {
          type: String,
          default: defaultUserSettings.general.appLanguage,
        },
        autoRotateScreen: {
          type: Boolean,
          default: defaultUserSettings.general.autoRotateScreen,
        },
      },
      notifications: {
        subscriptions: {
          type: Boolean,
          default: defaultUserSettings.notifications.subscriptions,
        },
        recommendedVideos: {
          type: Boolean,
          default: defaultUserSettings.notifications.recommendedVideos,
        },
        activityOnMyComments: {
          type: Boolean,
          default: defaultUserSettings.notifications.activityOnMyComments,
        },
      },
      quality: {
        videoQualityMobile: {
          type: String,
          default: defaultUserSettings.quality.videoQualityMobile,
        },
        videoQualityWifi: {
          type: String,
          default: defaultUserSettings.quality.videoQualityWifi,
        },
        audioQuality: {
          type: String,
          default: defaultUserSettings.quality.audioQuality,
        },
      },
      downloads: {
        downloadQuality: {
          type: String,
          default: defaultUserSettings.downloads.downloadQuality,
        },
        downloadOverWifiOnly: {
          type: Boolean,
          default: defaultUserSettings.downloads.downloadOverWifiOnly,
        },
      },
    },
    default: defaultUserSettings,
  })
  settings: UserSettings;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes
UserSchema.index({ email: 1 });
UserSchema.index({ kingsChatUserId: 1 }, { sparse: true });
UserSchema.index({ roles: 1 });
UserSchema.index({ createdAt: -1 });

// Ensure virtuals are included in JSON output
UserSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { password?: unknown }).password;
    delete (result as { refreshToken?: unknown }).refreshToken;
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

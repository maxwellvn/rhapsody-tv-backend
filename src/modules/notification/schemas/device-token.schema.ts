import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DeviceTokenDocument = HydratedDocument<DeviceToken>;

@Schema({ timestamps: true })
export class DeviceToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, index: true })
  token: string;

  @Prop({ enum: ['expo', 'fcm', 'apns'], default: 'expo' })
  platform: string;

  @Prop()
  deviceId?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastUsedAt?: Date;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

// Ensure unique token per user
DeviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

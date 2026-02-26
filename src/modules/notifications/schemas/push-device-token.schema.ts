import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PushDeviceTokenDocument = HydratedDocument<PushDeviceToken>;

@Schema({ timestamps: true })
export class PushDeviceToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true, unique: true, index: true })
  token: string;

  @Prop({ trim: true, default: 'unknown' })
  platform?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: Date.now })
  lastSeenAt: Date;
}

export const PushDeviceTokenSchema =
  SchemaFactory.createForClass(PushDeviceToken);

PushDeviceTokenSchema.index({ userId: 1, isActive: 1 });
PushDeviceTokenSchema.index({ userId: 1, token: 1 }, { unique: true });

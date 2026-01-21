import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// Compound unique index to prevent duplicate subscriptions
SubscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true });

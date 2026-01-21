import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChannelSubscriptionDocument = HydratedDocument<ChannelSubscription>;

@Schema({ timestamps: true })
export class ChannelSubscription {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ default: true })
  isSubscribed: boolean;

  @Prop({ default: true })
  notifyOnNewVideo: boolean;

  @Prop({ default: true })
  notifyOnGoLive: boolean;

  @Prop({ default: true })
  notifyOnNewProgram: boolean;
}

export const ChannelSubscriptionSchema =
  SchemaFactory.createForClass(ChannelSubscription);

ChannelSubscriptionSchema.index({ userId: 1, channelId: 1 }, { unique: true });
ChannelSubscriptionSchema.index({ channelId: 1, isSubscribed: 1 });

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChannelDocument = HydratedDocument<Channel>;

@Schema({ timestamps: true })
export class Channel {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ trim: true })
  description?: string;

  @Prop()
  logoUrl?: string;

  @Prop()
  coverImageUrl?: string;

  @Prop({ default: 0 })
  subscriberCount: number;

  @Prop({ default: 0 })
  videoCount: number;

  @Prop({ trim: true })
  websiteUrl?: string;

  @Prop({ type: Types.ObjectId, ref: 'LiveStream' })
  defaultLiveStreamId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Number, min: 0, max: 1000 })
  displayOrder?: number;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

// Indexes
ChannelSchema.index({ slug: 1 }, { unique: true });
ChannelSchema.index({ isActive: 1 });
ChannelSchema.index({ createdAt: -1 });
ChannelSchema.index({ isActive: 1, displayOrder: 1 });

// Ensure __v is removed
ChannelSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

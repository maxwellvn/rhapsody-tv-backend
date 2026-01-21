import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

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

  @Prop({ default: true })
  isActive: boolean;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

// Indexes
ChannelSchema.index({ slug: 1 }, { unique: true });
ChannelSchema.index({ isActive: 1 });
ChannelSchema.index({ createdAt: -1 });

// Ensure __v is removed
ChannelSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    const result = { ...ret };
    delete (result as { __v?: unknown }).__v;
    return result;
  },
});

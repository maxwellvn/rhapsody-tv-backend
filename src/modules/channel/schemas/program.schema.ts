import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProgramDocument = HydratedDocument<Program>;

export enum AnnouncementType {
  EVENT = 'event',
  PROGRAM = 'program',
  SHOW = 'show',
  SPECIAL = 'special',
}

@Schema({ timestamps: true })
export class Program {
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ trim: true, sparse: true })
  externalId?: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ trim: true })
  category?: string;

  @Prop({ trim: true })
  thumbnailUrl?: string;

  @Prop({
    required: true,
    enum: AnnouncementType,
    default: AnnouncementType.PROGRAM,
    index: true,
  })
  announcementType: AnnouncementType;

  @Prop({ default: false })
  isLive: boolean;

  @Prop({ default: 0 })
  viewerCount: number;

  @Prop({ default: 0 })
  bookmarkCount: number;

  @Prop({ type: Types.ObjectId, ref: 'Video' })
  videoId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'LiveStream' })
  liveStreamId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProgramSchema = SchemaFactory.createForClass(Program);

ProgramSchema.index({ channelId: 1, isActive: 1 });
ProgramSchema.index({ isLive: 1 });
ProgramSchema.index({ externalId: 1 }, { unique: true, sparse: true });

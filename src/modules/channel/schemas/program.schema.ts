import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProgramDocument = HydratedDocument<Program>;

export enum ProgramScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ONCE = 'once',
}

@Schema({ timestamps: true })
export class Program {
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    required: true,
    enum: ProgramScheduleType,
    default: ProgramScheduleType.ONCE,
    index: true,
  })
  scheduleType: ProgramScheduleType;

  @Prop({ trim: true })
  startTimeOfDay?: string;

  @Prop({ trim: true })
  endTimeOfDay?: string;

  @Prop({ type: [Number], default: undefined })
  daysOfWeek?: number[];

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop()
  durationInMinutes?: number;

  @Prop({ trim: true })
  category?: string;

  @Prop({ trim: true, default: 'UTC' })
  timezone?: string;

  @Prop({ trim: true })
  thumbnailUrl?: string;

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

ProgramSchema.index({ channelId: 1, startTime: 1 });
ProgramSchema.index({ startTime: 1, endTime: 1 });
ProgramSchema.index({ isLive: 1 });

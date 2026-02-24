import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ScheduleDocument = HydratedDocument<Schedule>;

export enum ScheduleTargetType {
  CHANNEL = 'channel',
  PROGRAM = 'program',
}

export enum ScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ONCE = 'once',
}

@Schema({ timestamps: true })
export class Schedule {
  @Prop({
    required: true,
    enum: ScheduleTargetType,
    index: true,
  })
  targetType: ScheduleTargetType;

  @Prop({ type: Types.ObjectId, required: true, index: true })
  targetId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ScheduleType,
    default: ScheduleType.ONCE,
  })
  scheduleType: ScheduleType;

  @Prop({ trim: true })
  startTimeOfDay?: string;

  @Prop({ trim: true })
  endTimeOfDay?: string;

  @Prop({ type: [Number], default: undefined })
  daysOfWeek?: number[];

  @Prop()
  startTime?: Date;

  @Prop()
  endTime?: Date;

  @Prop()
  durationInMinutes?: number;

  @Prop({ trim: true, default: 'UTC' })
  timezone?: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ trim: true })
  title?: string;

  @Prop({ trim: true })
  description?: string;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);

ScheduleSchema.index({ targetType: 1, targetId: 1 });
ScheduleSchema.index({ startTime: 1, endTime: 1 });
ScheduleSchema.index({ isActive: 1 });

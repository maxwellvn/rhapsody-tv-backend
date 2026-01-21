import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProgramDocument = HydratedDocument<Program>;

/**
 * Schedule type determines how the program is scheduled
 * - 'daily': Runs every day at the specified time
 * - 'weekly': Runs on specific days of the week
 * - 'once': One-time special program on a specific date
 */
export enum ScheduleType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  ONCE = 'once',
}

/**
 * Days of the week for weekly scheduling
 */
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

@Schema({ timestamps: true })
export class Program {
  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ trim: true })
  description?: string;

  /**
   * Schedule type for this program
   * Default is 'once' for backward compatibility
   */
  @Prop({
    type: String,
    enum: ScheduleType,
    default: ScheduleType.ONCE,
    index: true,
  })
  scheduleType: ScheduleType;

  /**
   * For DAILY/WEEKLY: Time of day when program starts (HH:mm format, e.g., "08:00")
   * For ONCE: Not used (use startTime instead)
   */
  @Prop({ trim: true })
  startTimeOfDay?: string;

  /**
   * For DAILY/WEEKLY: Time of day when program ends (HH:mm format, e.g., "09:30")
   * For ONCE: Not used (use endTime instead)
   */
  @Prop({ trim: true })
  endTimeOfDay?: string;

  /**
   * For WEEKLY: Array of days when the program airs (0 = Sunday, 6 = Saturday)
   * For DAILY/ONCE: Not used
   */
  @Prop({ type: [Number], default: [] })
  daysOfWeek: number[];

  /**
   * For ONCE: Specific date/time when program starts
   * For DAILY/WEEKLY: Optional - when the recurring schedule starts (defaults to now)
   */
  @Prop()
  startTime?: Date;

  /**
   * For ONCE: Specific date/time when program ends
   * For DAILY/WEEKLY: Optional - when the recurring schedule ends (no end = indefinite)
   */
  @Prop()
  endTime?: Date;

  /**
   * Duration in minutes (calculated or provided)
   */
  @Prop()
  durationInMinutes?: number;

  /**
   * Timezone for the schedule (e.g., "America/New_York", "UTC")
   * Default is UTC
   */
  @Prop({ trim: true, default: 'UTC' })
  timezone: string;

  @Prop({ trim: true })
  category?: string;

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

  /**
   * Thumbnail image URL for the program
   */
  @Prop({ trim: true })
  thumbnailUrl?: string;
}

export const ProgramSchema = SchemaFactory.createForClass(Program);

// Transform _id to id in JSON output
ProgramSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    const result = { ...ret, id: ret._id?.toString() };
    delete (result as any)._id;
    return result;
  },
});

ProgramSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    const result = { ...ret, id: ret._id?.toString() };
    delete (result as any)._id;
    return result;
  },
});

// Indexes for efficient queries
ProgramSchema.index({ channelId: 1, startTime: 1 });
ProgramSchema.index({ startTime: 1, endTime: 1 });
ProgramSchema.index({ isLive: 1 });
ProgramSchema.index({ scheduleType: 1 });
ProgramSchema.index({ channelId: 1, scheduleType: 1 });
ProgramSchema.index({ daysOfWeek: 1 });

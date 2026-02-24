import { BadRequestException } from '@nestjs/common';
import { ScheduleDocument, ScheduleType } from '../schemas/schedule.schema';

/** Default timezone for the application (WAT = UTC+1) */
const DEFAULT_TIMEZONE = 'Africa/Lagos';

/** Known timezone offsets in minutes from UTC */
const TIMEZONE_OFFSETS: Record<string, number> = {
  'UTC': 0,
  'Africa/Lagos': 60,       // WAT  (UTC+1)
  'America/New_York': -300,  // EST  (UTC-5)
  'America/Chicago': -360,   // CST  (UTC-6)
  'America/Denver': -420,    // MST  (UTC-7)
  'America/Los_Angeles': -480, // PST (UTC-8)
  'Europe/London': 0,        // GMT  (UTC+0)
  'Europe/Paris': 60,        // CET  (UTC+1)
  'Asia/Tokyo': 540,         // JST  (UTC+9)
};

/** Get UTC offset in minutes for a timezone string. Defaults to WAT (+60). */
function getTimezoneOffsetMinutes(timezone?: string): number {
  if (!timezone) return TIMEZONE_OFFSETS[DEFAULT_TIMEZONE];
  return TIMEZONE_OFFSETS[timezone] ?? TIMEZONE_OFFSETS[DEFAULT_TIMEZONE];
}

export function toDate(value?: string | Date): Date | undefined {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export function durationFromTimes(
  startTimeOfDay: string,
  endTimeOfDay: string,
): number {
  const [startHours, startMinutes] = startTimeOfDay.split(':').map(Number);
  const [endHours, endMinutes] = endTimeOfDay.split(':').map(Number);
  const start = startHours * 60 + startMinutes;
  const end = endHours * 60 + endMinutes;
  return end > start ? end - start : 24 * 60 - start + end;
}

/**
 * Convert HH:mm in the given timezone to a UTC Date based on a reference date.
 */
export function dateFromTimeOfDay(
  timeOfDay: string,
  base: Date,
  timezone?: string,
): Date {
  const [hours, minutes] = timeOfDay.split(':').map(Number);
  const offset = getTimezoneOffsetMinutes(timezone);
  const date = new Date(base);
  // Convert local time to UTC: subtract the offset
  date.setUTCHours(hours, minutes, 0, 0);
  date.setUTCMinutes(date.getUTCMinutes() - offset);
  return date;
}

export function normalizeScheduleData(
  dto: {
    scheduleType?: string;
    startTimeOfDay?: string;
    endTimeOfDay?: string;
    daysOfWeek?: number[];
    startTime?: string | Date;
    endTime?: string | Date;
    timezone?: string;
    title?: string;
    description?: string;
  },
  existing?: {
    scheduleType?: string;
    startTimeOfDay?: string;
    endTimeOfDay?: string;
    daysOfWeek?: number[];
    startTime?: Date;
    endTime?: Date;
    timezone?: string;
  },
): Record<string, unknown> {
  const scheduleType =
    dto.scheduleType ?? existing?.scheduleType ?? ScheduleType.ONCE;

  const timezone = dto.timezone ?? existing?.timezone ?? DEFAULT_TIMEZONE;

  if (scheduleType === ScheduleType.ONCE) {
    const startTime = toDate(dto.startTime ?? existing?.startTime);
    const endTime = toDate(dto.endTime ?? existing?.endTime);

    if (!startTime || !endTime) {
      throw new BadRequestException(
        'startTime and endTime are required for once schedules',
      );
    }

    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    return {
      scheduleType,
      startTime,
      endTime,
      durationInMinutes: Math.round(
        (endTime.getTime() - startTime.getTime()) / (1000 * 60),
      ),
      startTimeOfDay: undefined,
      endTimeOfDay: undefined,
      daysOfWeek: undefined,
      timezone,
    };
  }

  const startTimeOfDay =
    dto.startTimeOfDay ?? existing?.startTimeOfDay ?? undefined;
  const endTimeOfDay =
    dto.endTimeOfDay ?? existing?.endTimeOfDay ?? undefined;

  if (!startTimeOfDay || !endTimeOfDay) {
    throw new BadRequestException(
      'startTimeOfDay and endTimeOfDay are required for recurring schedules',
    );
  }

  const daysOfWeek =
    scheduleType === ScheduleType.WEEKLY
      ? (dto.daysOfWeek ?? existing?.daysOfWeek ?? [])
      : undefined;

  if (
    scheduleType === ScheduleType.WEEKLY &&
    (!daysOfWeek || daysOfWeek.length === 0)
  ) {
    throw new BadRequestException(
      'daysOfWeek must be provided for weekly schedules',
    );
  }

  // startTime/endTime are optional for recurring schedules (lifetime if omitted)
  const startTime = toDate(dto.startTime) ?? toDate(existing?.startTime);
  const endTime = toDate(dto.endTime) ?? toDate(existing?.endTime);

  return {
    scheduleType,
    startTimeOfDay,
    endTimeOfDay,
    daysOfWeek,
    startTime: startTime ?? undefined,
    endTime: endTime ?? undefined,
    durationInMinutes: durationFromTimes(startTimeOfDay, endTimeOfDay),
    timezone,
  };
}

/**
 * Resolve the actual UTC time window for a schedule on a given reference date.
 * Time-of-day fields are interpreted in the schedule's timezone (default WAT).
 */
export function resolveScheduleWindow(
  schedule: ScheduleDocument,
  referenceDate = new Date(),
): { startTime: Date; endTime: Date } | null {
  if (!schedule.startTimeOfDay || !schedule.endTimeOfDay) {
    // 'once' schedule or no time-of-day info
    if (schedule.startTime && schedule.endTime) {
      const startTime = new Date(schedule.startTime);
      const endTime = new Date(schedule.endTime);
      if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return null;
      }
      return { startTime, endTime };
    }
    // No dates at all - lifetime schedule
    return null;
  }

  if (
    schedule.scheduleType === 'weekly' &&
    schedule.daysOfWeek?.length &&
    !schedule.daysOfWeek.includes(referenceDate.getUTCDay())
  ) {
    return null;
  }

  const offset = getTimezoneOffsetMinutes(schedule.timezone);

  const [startHours, startMinutes] = schedule.startTimeOfDay
    .split(':')
    .map(Number);
  const [endHours, endMinutes] = schedule.endTimeOfDay
    .split(':')
    .map(Number);

  // Convert local time to UTC by subtracting the offset
  const startTime = new Date(referenceDate);
  startTime.setUTCHours(startHours, startMinutes, 0, 0);
  startTime.setUTCMinutes(startTime.getUTCMinutes() - offset);

  const endTime = new Date(referenceDate);
  endTime.setUTCHours(endHours, endMinutes, 0, 0);
  endTime.setUTCMinutes(endTime.getUTCMinutes() - offset);

  if (endTime <= startTime) {
    endTime.setUTCDate(endTime.getUTCDate() + 1);
  }

  return { startTime, endTime };
}

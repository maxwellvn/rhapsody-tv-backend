import { Injectable, Logger } from '@nestjs/common';

export interface ParsedScheduleEntry {
  programName: string;
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  days: number[]; // 0=Sunday..6=Saturday
}

// Suffixes to strip when normalizing program names for matching
const STRIP_SUFFIXES =
  /\s*[\(\[]?\s*(REBROADCAST|REPEAT|RPT|LIVE|NEW\s*EPS?D?|NEW\s*EPISODE?|NEW|LIVE\s*EDITION|RPT\s*-\s*EPSD?|1ST\s*NEW\s*EPS|EPSD?\d*)\s*[\)\]]?\s*/gi;

const DURATION_SUFFIX = /\s+\d+\s*MINS?$/i;

@Injectable()
export class ScheduleParserService {
  private readonly logger = new Logger(ScheduleParserService.name);

  normalizeProgramName(raw: string): string {
    let name = raw.trim();
    // Remove suffixes like (REBROADCAST), [REPEAT], NEW EPS, etc.
    name = name.replace(STRIP_SUFFIXES, '');
    // Remove duration suffixes like "30MINS"
    name = name.replace(DURATION_SUFFIX, '');
    // Remove trailing hyphens, dashes, spaces
    name = name.replace(/[\s\-]+$/, '').replace(/^[\s\-]+/, '');
    // Collapse multiple spaces
    name = name.replace(/\s+/g, ' ').trim();
    return name;
  }

  parseScheduleJs(jsContent: string): ParsedScheduleEntry[] | null {
    try {
      // The programs.js file typically exports an array of schedule data.
      // Try to extract JSON-like data from it.
      // Look for array assignment patterns like: var programs = [...] or module.exports = [...]
      const arrayMatch = jsContent.match(
        /(?:var\s+\w+\s*=|module\.exports\s*=|export\s+(?:default\s+)?)\s*(\[[\s\S]*\])/,
      );
      if (arrayMatch) {
        // Try to parse as JSON
        try {
          const data = JSON.parse(arrayMatch[1]);
          return this.convertParsedData(data);
        } catch {
          // Not valid JSON, try eval-like approach with regex
        }
      }

      // Fallback: look for structured schedule data patterns
      this.logger.warn('Could not parse programs.js structure, using fallback');
      return null;
    } catch (error) {
      this.logger.warn(`Schedule JS parsing failed: ${error}`);
      return null;
    }
  }

  private convertParsedData(data: any[]): ParsedScheduleEntry[] | null {
    const entries: ParsedScheduleEntry[] = [];
    // Generic conversion — adapt based on actual programs.js structure
    for (const item of data) {
      if (item.program && item.time && item.day !== undefined) {
        entries.push({
          programName: this.normalizeProgramName(item.program),
          startTime: item.time,
          endTime: item.endTime || '',
          days: Array.isArray(item.day) ? item.day : [item.day],
        });
      }
    }
    return entries.length > 0 ? entries : null;
  }

  getFallbackSchedule(): ParsedScheduleEntry[] {
    return FALLBACK_SCHEDULE;
  }
}

// Time conversion helper: "5:00 AM" -> "05:00", "12:30 PM" -> "12:30"
function to24h(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const period = match[3].toUpperCase();
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${h.toString().padStart(2, '0')}:${m}`;
}

// Day name -> number
const DAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

// Build fallback from the RTV_SCHEDULE.md data
interface RawSlot {
  time: string; // e.g. "5:00-5:30 AM"
  entries: (string | null)[]; // 7 entries, one per day (Sun-Sat), null for "—"
}

const RAW_SCHEDULE: RawSlot[] = [
  { time: '5:00-5:30 AM', entries: ['ATMOSPHERE FOR MIRACLES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (REBROADCAST)'] },
  { time: '5:30-6:00 AM', entries: ['RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES'] },
  { time: '6:00-6:30 AM', entries: ['RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES'] },
  { time: '6:30-7:00 AM', entries: ['RHAPSODY DAILIES KIDDIES', 'RHAPSODY DAILIES KIDDIES', 'RHAPSODY DAILIES KIDDIES', 'RHAPSODY DAILIES KIDDIES', 'RHAPSODY DAILIES KIDDIES', 'RHAPSODY DAILIES KIDDIES', 'RHAPSODY DAILIES KIDDIES'] },
  { time: '7:00-7:30 AM', entries: ['RHAPSODY TRAVELS (RPT)', 'THIS MORNING WITH RHAPSODY OF REALITIES (LIVE)', 'THIS MORNING WITH RHAPSODY OF REALITIES (LIVE)', 'THIS MORNING WITH RHAPSODY OF REALITIES (LIVE)', 'THIS MORNING WITH RHAPSODY OF REALITIES (LIVE)', 'THIS MORNING WITH RHAPSODY OF REALITIES (LIVE)', 'THIS MORNING WITH RHAPSODY OF REALITIES (LIVE)'] },
  { time: '7:30-8:00 AM', entries: ['JOURNEY TO ALL LANGUAGES (RPT)', null, null, null, null, null, null] },
  { time: '8:00-8:30 AM', entries: ['REON GRO (REPEAT)', null, null, null, null, null, null] },
  { time: '8:30-9:00 AM', entries: [null, null, null, null, null, null, null] },
  { time: '9:00-9:30 AM', entries: ['THE WORD WAY (REPEAT)', 'THE DAY GOD SPOKE MY LANGUAGE (RPT)', 'LIVING PAGES NEW EPS', 'TAKE 5 NEW EPSD', 'RHAPSODY OF GOD (NEW)', 'THE DAY GOD SPOKE MY LANGUAGE- NEW EPS', 'RORK TV 30MINS (NEW EPSD)'] },
  { time: '9:30-10:00 AM', entries: ['RHAPSODY YLW DOCUMENTARY', 'THE WORD WAY (NEW EPS)', 'NO ONE LEFT BEHIND (NEW)', 'BEYOND THE INCREDIBLE (NEW)', 'REACHOUT CAMPAIGNS (RPT)', 'PASTOR CHRIS WORTH HEARING (NEW EPS)', 'RHAPSODY YLW DOCUMENTARY'] },
  { time: '10:00-10:30 AM', entries: ['RORK TV 1HR (NEW EPISODE)', 'RHAPSODY STORIES- NEW EPS', 'RHAPSODY TRAVELS- NEW EPS', 'RHAPSODY STORIES- (RPT)', 'RHAPSODY TRAVELS- (RPT)', 'REACHOUT CAMPAIGNS- NEW EPS', 'MY RHAPSODY MY FAMILY NEW EPS'] },
  { time: '10:30-11:00 AM', entries: [null, 'WORD IN THE STREET - NEW EPS', 'GO DEEPER-1ST NEW EPS', 'WORD IN THE STREET- (RPT)', 'THE WORD WAY (RPT)', 'BEYOND THE INCREDIBLE (RPT)', 'GO DEEPER- (RPT)'] },
  { time: '11:00-11:30 AM', entries: ['RHAPSODY OF GOD (RPT)', 'JOURNEY TO ALL LANGUAGES', 'RHAPSODY HEALINGS (REPEAT)', 'BIBLE PACT (NEW)', 'LIVING PAGES (RPT)', 'RHAPSODY STORIES', 'RAISED FROM THE DEAD (REBROADCAST)'] },
  { time: '11:30-12:00 PM', entries: ['NO ONE LEFT BEHIND (REPEAT)', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', null] },
  { time: '12:00-12:30 PM', entries: ['EVERYDAY AN OUTREACH/FILLER', 'PRAYER & FILLER', 'EVERYDAY AN OUTREACH/FILLER', 'PRAYER & FILLER', 'EVERYDAY AN OUTREACH/FILLER', 'PRAYER & FILLER', 'EVERYDAY AN OUTREACH/FILLER'] },
  { time: '12:30-1:00 PM', entries: ['RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES', 'RHAPSODY DAILIES'] },
  { time: '1:00-1:30 PM', entries: ['REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY'] },
  { time: '1:30-2:00 PM', entries: [null, null, null, null, null, null, null] },
  { time: '2:00-2:30 PM', entries: ['A BILLION TESTIMONIES AND MORE [REPEAT]', 'A BILLION TESTIMONIES AND MORE [REPEAT]', 'A BILLION TESTIMONIES AND MORE (LIVE)', 'A BILLION TESTIMONIES AND MORE [REPEAT]', 'A BILLION TESTIMONIES AND MORE [REPEAT]', 'A BILLION TESTIMONIES AND MORE (LIVE)', 'A BILLION TESTIMONIES AND MORE [REPEAT]'] },
  { time: '2:30-3:00 PM', entries: [null, null, null, null, null, null, null] },
  { time: '3:00-3:30 PM', entries: ['ATMOSPHERE FOR MIRACLES (LIVE)', 'THIS MORNING WITH RHAPSODY OF REALITIES (REBROADCAST)', 'THIS MORNING WITH RHAPSODY OF REALITIES (REBROADCAST)', 'THIS MORNING WITH RHAPSODY OF REALITIES (REBROADCAST)', 'THIS MORNING WITH RHAPSODY OF REALITIES (REBROADCAST)', 'THIS MORNING WITH RHAPSODY OF REALITIES (REBROADCAST)', 'ATMOSPHERE FOR MIRACLES (LIVE)'] },
  { time: '3:30-4:00 PM', entries: ['RHAPSODY HEALING (NEW)', null, null, null, null, null, 'BTI (REBROADCAST)'] },
  { time: '4:00-4:30 PM', entries: ['PASTOR CHRIS WORTH HEARING (REPEAT)', null, null, null, null, null, 'REON GRO (LIVE)'] },
  { time: '4:30-5:00 PM', entries: ['MY RHAPSODY MY FAMILY [REPEAT]', null, null, null, null, null, null] },
  { time: '5:00-5:30 PM', entries: ['REACHOUT WORLD NATIONS (RPT)', 'REACHOUT WORLD NATIONS', 'REACHOUT WORLD NATIONS', 'REACHOUT WORLD NATIONS', 'REACHOUT WORLD NATIONS', 'REACHOUT WORLD NATIONS', 'RHAPSODY IN NIGERIAN LANGUAGES (LIVE EDITION)'] },
  { time: '5:30-6:00 PM', entries: [null, null, null, null, null, null, null] },
  { time: '6:00-6:30 PM', entries: ['RHAPSODY IN SOUTH AFRICAN LANGUAGES', 'RHAPSODY IN SOUTH AFRICAN LANGUAGES', 'RHAPSODY IN SOUTH AFRICAN LANGUAGES', 'RHAPSODY IN SOUTH AFRICAN LANGUAGES', 'RHAPSODY IN SOUTH AFRICAN LANGUAGES', 'RHAPSODY IN SOUTH AFRICAN LANGUAGES', 'RHAPSODY IN SOUTH AFRICAN LANGUAGES'] },
  { time: '6:30-7:00 PM', entries: ['RHAPSODY DAILIES KIDDIES (REBROADCAST)', 'RHAPSODY DAILIES KIDDIES (REBROADCAST)', 'RHAPSODY DAILIES KIDDIES (REBROADCAST)', 'RHAPSODY DAILIES KIDDIES (REBROADCAST)', 'RHAPSODY DAILIES KIDDIES (REBROADCAST)', 'RHAPSODY DAILIES KIDDIES (REBROADCAST)', 'RHAPSODY DAILIES KIDDIES (REBROADCAST)'] },
  { time: '7:00-7:30 PM', entries: ['RORK TV 1HR (REBROADCAST)', 'RHAPSODY STORIES (REBROADCAST)', 'RHAPSODY ON THE DIGITAL FRONTIER (LIVE)', 'THE DIGITAL FRONTIER (RPT)', 'RHAPSODY TRAVELS- (RPT)', 'RHAPSODY ON THE DIGITAL FRONTIER (LIVE)', 'RHAPSODY ON THE DIGITAL FRONTIER (RPT)'] },
  { time: '7:30-8:00 PM', entries: [null, 'MY RHAPSODY MY FAMILY [REPEAT]', null, null, 'THE WORD WAY (RPT)', null, null] },
  { time: '8:00-8:30 PM', entries: ['RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RAISED FROM THE DEAD (NEW)', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES', 'RHAPSODY IN NIGERIAN LANGUAGES DAILIES'] },
  { time: '8:30-9:00 PM', entries: ['LIVING PAGES NEW [REPEAT]', 'THE WORD WAY (REBROADCAST)', 'GO DEEPER- (REBROADCAST)', 'RHAPSODY STORIES (REBROADCAST)', 'REACHOUT CAMPAIGNS (REBROADCAST)', 'PASTOR CHRIS WORTH HEARING (REBROADCAST)', 'JOURNEY TO ALL LANGUAGES (RPT - EPSD)'] },
  { time: '9:00-9:30 PM', entries: ['BIBLE PACT (RPT - EPSD)', 'THE DAY GOD SPOKE MY LANGUAGE (RPT)', 'LIVING PAGES NEW (REBROADCAST)', 'TAKE 5 (REBROADCAST)', 'RHAPSODY OF GOD (REBROADCAST)', 'THE DAY GOD SPOKE MY LANGUAGE- NEW EPS (REBROADCAST)', 'THE DAY GOD SPOKE MY LANGUAGE (RPT)'] },
  { time: '9:30-10:00 PM', entries: ['RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY (REBROADCAST)', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'WORD IN THE STREET- (RPT - EP1)'] },
  { time: '10:00-10:30 PM', entries: ['EVERYDAY AN OUTREACH/FILLER', 'PRAYER & FILLER', 'EVERYDAY AN OUTREACH/FILLER', 'PRAYER & FILLER', 'EVERYDAY AN OUTREACH/FILLER', 'PRAYER & FILLER', 'EVERYDAY AN OUTREACH/FILLER'] },
  { time: '10:30-11:00 PM', entries: ['BEYOND THE INCREDIBLE (RPT)', 'WORD IN THE STREET - (REBROADCAST)', 'NO ONE LEFT BEHIND (REBROADCAST)', 'BEYOND THE INCREDIBLE (REBROADCAST)', 'RHAPSODY TRAVELS', 'BEYOND THE INCREDIBLE (RPT)', 'MY RHAPSODY MY FAMILY (REBROADCAST)'] },
  { time: '11:00-11:30 PM', entries: ['RHAPSODY IN NIGERIAN LANGUAGES (LIVE EDITION - REPEAT)', 'JOURNEY TO ALL LANGUAGES (RPT)', 'RHAPSODY TRAVELS (REBROADCAST)', 'WORD IN THE STREET- RPT', 'RHAPSODY IN NIGERIAN LANGUAGES (LIVE EDITION - REPEAT)', 'REACHOUT CAMPAIGNS (REBROADCAST)', 'RHAPSODY IN NIGERIAN LANGUAGES (LIVE EDITION - REBROADCAST)'] },
  { time: '11:30-12:00 AM', entries: [null, 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY HEALINGS (REBROADCAST)', 'BIBLE PACT (REBROADCAST)', null, 'TAKE 5 (REBROADCAST)', null] },
  { time: '12:00-12:30 AM', entries: ['RHAPSODY DAILIES (REBROADCAST)', 'RHAPSODY DAILIES (REBROADCAST)', 'RHAPSODY DAILIES (REBROADCAST)', 'RHAPSODY DAILIES (REBROADCAST)', 'RHAPSODY DAILIES (REBROADCAST)', 'RHAPSODY DAILIES (REBROADCAST)', 'RHAPSODY DAILIES (REBROADCAST)'] },
  { time: '12:30-1:00 AM', entries: ['RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY', 'RHAPSODY YLW DOCUMENTARY'] },
  { time: '1:00-1:30 AM', entries: ['REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY', 'REACH-OUT-WORLD DAY'] },
  { time: '1:30-2:00 AM', entries: [null, null, null, null, null, null, null] },
  { time: '2:00-2:30 AM', entries: ['A BILLION TESTIMONIES AND MORE REBROADCAST', 'A BILLION TESTIMONIES AND MORE REBROADCAST', 'A BILLION TESTIMONIES AND MORE REBROADCAST', 'A BILLION TESTIMONIES AND MORE REBROADCAST', 'A BILLION TESTIMONIES AND MORE REBROADCAST', 'A BILLION TESTIMONIES AND MORE REBROADCAST', 'A BILLION TESTIMONIES AND MORE REBROADCAST'] },
  { time: '2:30-3:00 AM', entries: [null, null, null, null, null, null, null] },
  { time: '3:00-3:30 AM', entries: ['LOVEWORLD SINGERS', 'LOVEWORLD SINGERS', 'LOVEWORLD SINGERS', 'LOVEWORLD SINGERS', 'LOVEWORLD SINGERS', 'RFTD (REBROADCAST)', 'RFTD (REBROADCAST)'] },
  { time: '3:30-4:00 AM', entries: ['RHAPSODY LANGUAGES', 'RHAPSODY LANGUAGES', 'RHAPSODY LANGUAGES', 'RHAPSODY LANGUAGES', 'RHAPSODY LANGUAGES', 'RHAPSODY LANGUAGES', 'RHAPSODY LANGUAGES'] },
  { time: '4:00-4:30 AM', entries: ['PROMOS/FILLERS', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'EVERYDAY AN OUTREACH'] },
  { time: '4:30-5:00 AM', entries: ['REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)', 'REACHOUT WORLD TODAY (REBROADCAST)'] },
];

function parseTimeRange(timeStr: string): { start: string; end: string } | null {
  // e.g. "5:00-5:30 AM" or "11:30-12:00 PM" or "11:30-12:00 AM"
  const match = timeStr.match(
    /(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\s*(AM|PM)/i,
  );
  if (!match) return null;
  const period = match[3].toUpperCase();
  const startRaw = match[1];
  const endRaw = match[2];

  // Determine AM/PM for start and end
  // If start hour > end hour within same period, end crosses to next period
  const startH = parseInt(startRaw.split(':')[0], 10);
  const endH = parseInt(endRaw.split(':')[0], 10);

  let startPeriod = period;
  let endPeriod = period;

  // Special case: "11:30-12:00 PM" means 11:30 AM to 12:00 PM
  if (startH === 11 && endH === 12 && period === 'PM') {
    startPeriod = 'AM';
    endPeriod = 'PM';
  }
  // "11:30-12:00 AM" means 11:30 PM to 12:00 AM
  if (startH === 11 && endH === 12 && period === 'AM') {
    startPeriod = 'PM';
    endPeriod = 'AM';
  }

  return {
    start: to24h(`${startRaw} ${startPeriod}`),
    end: to24h(`${endRaw} ${endPeriod}`),
  };
}

const STRIP_FOR_NORMALIZE =
  /\s*[\(\[]?\s*(REBROADCAST|REPEAT|RPT|LIVE|NEW\s*EPS?D?|NEW\s*EPISODE?|NEW|LIVE\s*EDITION|RPT\s*-\s*EPSD?|1ST\s*NEW\s*EPS|EPSD?\d*)\s*[\)\]]?\s*/gi;

function normalizeName(raw: string): string {
  let name = raw.trim();
  name = name.replace(STRIP_FOR_NORMALIZE, '');
  name = name.replace(/\s+\d+\s*MINS?$/i, '');
  name = name.replace(/[\s\-]+$/, '').replace(/^[\s\-]+/, '');
  name = name.replace(/\s+/g, ' ').trim();
  return name;
}

// Pre-build the fallback schedule
const FALLBACK_SCHEDULE: ParsedScheduleEntry[] = (() => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const grouped = new Map<string, { startTime: string; endTime: string; days: Set<number> }>();

  for (const slot of RAW_SCHEDULE) {
    const times = parseTimeRange(slot.time);
    if (!times) continue;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const entry = slot.entries[dayIdx];
      if (!entry) continue;
      const normalized = normalizeName(entry);
      if (!normalized) continue;

      const key = `${normalized}|${times.start}|${times.end}`;
      const existing = grouped.get(key);
      if (existing) {
        existing.days.add(dayIdx);
      } else {
        grouped.set(key, {
          startTime: times.start,
          endTime: times.end,
          days: new Set([dayIdx]),
        });
      }
    }
  }

  const result: ParsedScheduleEntry[] = [];
  for (const [key, value] of grouped) {
    const programName = key.split('|')[0];
    result.push({
      programName,
      startTime: value.startTime,
      endTime: value.endTime,
      days: Array.from(value.days).sort(),
    });
  }
  return result;
})();

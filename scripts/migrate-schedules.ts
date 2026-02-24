/**
 * Migration Script: Extract schedules from Programs into the new Schedule collection
 *
 * This script:
 * 1. Reads all existing Programs that have schedule data (scheduleType, startTime, endTime)
 * 2. For each: creates a Schedule document with targetType='program', copying schedule fields
 * 3. Sets announcementType='program' as default on all Programs missing it
 *
 * Run with: npx ts-node -r tsconfig-paths/register scripts/migrate-schedules.ts
 *
 * NOTE: This does NOT remove schedule fields from existing Programs (safe migration).
 * The updated Program schema simply ignores those fields.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// Minimal schema definitions for migration (raw, no NestJS decorators)
const ProgramMigrationSchema = new mongoose.Schema(
  {
    channelId: { type: mongoose.Types.ObjectId, ref: 'Channel' },
    title: String,
    description: String,
    category: String,
    thumbnailUrl: String,
    announcementType: String,
    // Old schedule fields (may exist on legacy documents)
    scheduleType: String,
    startTimeOfDay: String,
    endTimeOfDay: String,
    daysOfWeek: [Number],
    startTime: Date,
    endTime: Date,
    durationInMinutes: Number,
    timezone: String,
    isLive: Boolean,
    isActive: Boolean,
  },
  { timestamps: true, strict: false },
);

const ScheduleMigrationSchema = new mongoose.Schema(
  {
    targetType: { type: String, required: true },
    targetId: { type: mongoose.Types.ObjectId, required: true },
    scheduleType: { type: String, required: true },
    startTimeOfDay: String,
    endTimeOfDay: String,
    daysOfWeek: [Number],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationInMinutes: Number,
    timezone: String,
    isActive: { type: Boolean, default: true },
    title: String,
    description: String,
  },
  { timestamps: true },
);

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const ProgramModel = mongoose.model('Program', ProgramMigrationSchema);
  const ScheduleModel = mongoose.model('Schedule', ScheduleMigrationSchema);

  // Step 1: Find all programs that have schedule data
  const programsWithSchedules = await ProgramModel.find({
    startTime: { $exists: true, $ne: null },
    endTime: { $exists: true, $ne: null },
  }).lean();

  console.log(
    `Found ${programsWithSchedules.length} programs with schedule data to migrate.`,
  );

  let created = 0;
  let skipped = 0;

  for (const program of programsWithSchedules) {
    // Check if a schedule already exists for this program (idempotent)
    const existing = await ScheduleModel.findOne({
      targetType: 'program',
      targetId: program._id,
    });

    if (existing) {
      skipped++;
      continue;
    }

    // Map old scheduleType to new ScheduleType
    let scheduleType = program.scheduleType || 'once';
    if (!['daily', 'weekly', 'once'].includes(scheduleType)) {
      scheduleType = 'once';
    }

    const scheduleDoc: Record<string, any> = {
      targetType: 'program',
      targetId: program._id,
      scheduleType,
      startTime: program.startTime,
      endTime: program.endTime,
      isActive: program.isActive !== false,
      timezone: program.timezone || 'UTC',
    };

    // Copy time-of-day fields for daily/weekly
    if (scheduleType === 'daily' || scheduleType === 'weekly') {
      if (program.startTimeOfDay) {
        scheduleDoc.startTimeOfDay = program.startTimeOfDay;
      }
      if (program.endTimeOfDay) {
        scheduleDoc.endTimeOfDay = program.endTimeOfDay;
      }
    }

    // Copy days of week for weekly
    if (scheduleType === 'weekly' && program.daysOfWeek?.length) {
      scheduleDoc.daysOfWeek = program.daysOfWeek;
    }

    // Copy duration
    if (program.durationInMinutes) {
      scheduleDoc.durationInMinutes = program.durationInMinutes;
    }

    await ScheduleModel.create(scheduleDoc);
    created++;
  }

  console.log(`Schedules created: ${created}, skipped (already exist): ${skipped}`);

  // Step 2: Set announcementType='program' on all Programs that don't have it
  const updateResult = await ProgramModel.updateMany(
    {
      $or: [
        { announcementType: { $exists: false } },
        { announcementType: null },
        { announcementType: '' },
      ],
    },
    { $set: { announcementType: 'program' } },
  );

  console.log(
    `Updated ${updateResult.modifiedCount} programs with default announcementType='program'.`,
  );

  console.log('Migration complete.');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

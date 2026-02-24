import 'dotenv/config';
import mongoose from 'mongoose';
import { ChannelSchema } from '../src/modules/channel/schemas/channel.schema';
import {
  LiveStreamSchema,
  LiveStreamStatus,
} from '../src/modules/stream/schemas/live-stream.schema';
import {
  VideoSchema,
  VideoVisibility,
} from '../src/modules/stream/schemas/video.schema';
import { ProgramSchema } from '../src/modules/channel/schemas/program.schema';
import { ScheduleSchema } from '../src/modules/channel/schemas/schedule.schema';

const REAL_CHANNEL = {
  name: 'Rhapsody TV',
  slug: 'rhapsody-tv',
  description: 'The official channel for Rhapsody of Realities TV.',
  logoUrl: 'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/logo/rtv-logo_new.png',
  coverImageUrl:
    'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/logo/rtv-logo_new.png',
  websiteUrl: 'https://rhapsodyofrealities.org',
};

const REAL_HLS_URL =
  'https://2nbyjxnbl53k-hls-live.5centscdn.com/RTV/59a49be6dc0f146c57cd9ee54da323b1.sdp/playlist.m3u8';

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  // Create Models
  const ChannelModel = mongoose.model('Channel', ChannelSchema);
  const LiveStreamModel = mongoose.model('LiveStream', LiveStreamSchema);
  const VideoModel = mongoose.model('Video', VideoSchema);
  const ProgramModel = mongoose.model('Program', ProgramSchema);
  const ScheduleModel = mongoose.model('Schedule', ScheduleSchema);

  // 1. Clean up existing channel data and any rows with mock URLs.
  console.log('Cleaning up old data...');

  const mockUrlPattern = /(loremflickr\.com|test-streams\.mux\.dev|ik\.imagekit\.io\/\.\.\.)/i;

  const mockChannels = await ChannelModel.find({
    $or: [{ logoUrl: mockUrlPattern }, { coverImageUrl: mockUrlPattern }],
  }).select('_id');

  const mockChannelIds = mockChannels.map((c) => c._id);
  if (mockChannelIds.length > 0) {
    await LiveStreamModel.deleteMany({ channelId: { $in: mockChannelIds } });
    await VideoModel.deleteMany({ channelId: { $in: mockChannelIds } });
    await ProgramModel.deleteMany({ channelId: { $in: mockChannelIds } });
    await ScheduleModel.deleteMany({ targetId: { $in: mockChannelIds } });
    await ChannelModel.deleteMany({ _id: { $in: mockChannelIds } });
    console.log(`Removed ${mockChannelIds.length} channel(s) with mock URLs.`);
  }

  await LiveStreamModel.deleteMany({
    $or: [{ thumbnailUrl: mockUrlPattern }, { playbackUrl: mockUrlPattern }],
  });
  await VideoModel.deleteMany({
    $or: [{ thumbnailUrl: mockUrlPattern }, { playbackUrl: mockUrlPattern }],
  });

  const existingChannel = await ChannelModel.findOne({ slug: 'rhapsody-tv' });
  if (existingChannel) {
    const channelId = existingChannel._id;
    await LiveStreamModel.deleteMany({ channelId });
    await VideoModel.deleteMany({ channelId });
    const existingPrograms = await ProgramModel.find({ channelId }).select('_id');
    const existingProgramIds = existingPrograms.map((p) => p._id);
    await ScheduleModel.deleteMany({
      $or: [
        { targetType: 'channel', targetId: channelId },
        { targetType: 'program', targetId: { $in: existingProgramIds } },
      ],
    });
    await ProgramModel.deleteMany({ channelId });
    await ChannelModel.deleteOne({ _id: channelId });
    console.log('Removed existing Rhapsody TV channel and related data.');
  }

  // 2. Create Channel
  console.log('Creating Rhapsody TV Channel...');
  const channel = await ChannelModel.create({
    ...REAL_CHANNEL,
    subscriberCount: 0,
    videoCount: 4,
    isActive: true,
  });
  console.log(`Channel created: ${channel.name} (${channel._id})`);

  // 3. Create Live Streams
  console.log('Creating Live Streams...');
  const liveStream1 = await LiveStreamModel.create({
    channelId: channel._id,
    title: 'Rhapsody Daily Devotional Live',
    description: 'Join us for the daily reading of Rhapsody of Realities.',
    status: LiveStreamStatus.LIVE,
    startedAt: new Date(),
    thumbnailUrl:
      'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/thumbnails/travels-suriname-wales.png',
    isChatEnabled: true,
    playbackUrl: REAL_HLS_URL,
    rtmpUrl: 'rtmp://live.rhapsody.tv/app',
    streamKey: 'live_key_123',
  });

  await LiveStreamModel.create({
    channelId: channel._id,
    title: 'Global Prayer Network',
    description: 'Weekly prayer session.',
    status: LiveStreamStatus.SCHEDULED,
    scheduledStartAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    thumbnailUrl:
      'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/thumbnails/travels-suriname-wales.png',
    playbackUrl: REAL_HLS_URL,
    isChatEnabled: true,
  });

  // 4. Create Videos
  console.log('Creating Videos...');
  const videos = await VideoModel.create([
    {
      channelId: channel._id,
      title: 'RHAPSODY TRAVELS SURINAME AND WALES',
      description: 'Rhapsody Travels special edition.',
      playbackUrl:
        'https://d1ent1.loveworldcloud.com/~rorm/Rhapsody%20Travels%20-2025/NEW/R_%20Travels_Suriname_Updated_2025.mp4',
      thumbnailUrl:
        'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/thumbnails/travels-suriname-wales.png',
      durationSeconds: 3000,
      visibility: VideoVisibility.PUBLIC,
      viewCount: 5020,
      likeCount: 300,
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
    },
    {
      channelId: channel._id,
      title: 'Rhapsody News Update',
      description: 'Latest news from the ministry.',
      playbackUrl: REAL_HLS_URL,
      thumbnailUrl:
        'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/thumbnails/travels-suriname-wales.png',
      durationSeconds: 300,
      visibility: VideoVisibility.PUBLIC,
      viewCount: 1200,
      likeCount: 150,
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      channelId: channel._id,
      title: 'Partner Conference Highlights',
      description: 'Moments from the recent conference.',
      playbackUrl: REAL_HLS_URL,
      thumbnailUrl:
        'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/thumbnails/travels-suriname-wales.png',
      durationSeconds: 3600,
      visibility: VideoVisibility.PUBLIC,
      viewCount: 8000,
      likeCount: 1000,
      publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 1 month ago
    },
    {
      channelId: channel._id,
      title: 'Understanding Faith',
      description: 'Teaching series part 1.',
      playbackUrl: REAL_HLS_URL,
      thumbnailUrl:
        'https://rhapsodyofrealities.b-cdn.net/rhapsodytv/thumbnails/travels-suriname-wales.png',
      durationSeconds: 1800,
      visibility: VideoVisibility.PUBLIC,
      viewCount: 2500,
      likeCount: 200,
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
  ]);

  // 5. Create Programs (content-only, no schedule fields)
  console.log('Creating Programs...');
  const now = new Date();

  const program1 = await ProgramModel.create({
    channelId: channel._id,
    title: 'Rhapsody Daily',
    description: 'Daily devotional reading live.',
    category: 'Devotional',
    announcementType: 'program',
    isLive: true,
    viewerCount: 1200,
    liveStreamId: liveStream1._id,
  });

  const program2 = await ProgramModel.create({
    channelId: channel._id,
    title: 'Morning Inspiration',
    description: 'Start your day with the word.',
    category: 'Inspiration',
    announcementType: 'show',
    isLive: false,
    viewerCount: 0,
    videoId: videos[0]._id,
  });

  const program3 = await ProgramModel.create({
    channelId: channel._id,
    title: 'Evening Praise',
    description: 'Worship session.',
    category: 'Worship',
    announcementType: 'event',
    isLive: false,
    viewerCount: 0,
  });

  // 6. Create Schedules for the programs
  console.log('Creating Schedules...');

  // Daily schedule for Rhapsody Daily (lifetime - no start/end dates)
  await ScheduleModel.create({
    targetType: 'program',
    targetId: program1._id,
    scheduleType: 'daily',
    startTimeOfDay: '06:00',
    endTimeOfDay: '07:00',
    durationInMinutes: 60,
    timezone: 'Africa/Lagos',
    isActive: true,
  });

  // Weekly schedule for Morning Inspiration (lifetime - no start/end dates)
  await ScheduleModel.create({
    targetType: 'program',
    targetId: program2._id,
    scheduleType: 'weekly',
    startTimeOfDay: '08:00',
    endTimeOfDay: '09:00',
    daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
    durationInMinutes: 60,
    timezone: 'Africa/Lagos',
    isActive: true,
  });

  // One-time schedule for Evening Praise (requires start/end)
  await ScheduleModel.create({
    targetType: 'program',
    targetId: program3._id,
    scheduleType: 'once',
    startTime: new Date(now.getTime() + 5 * 60 * 60000),
    endTime: new Date(now.getTime() + 7 * 60 * 60000),
    durationInMinutes: 120,
    timezone: 'Africa/Lagos',
    isActive: true,
  });

  // Channel-level schedule (lifetime - no start/end dates)
  await ScheduleModel.create({
    targetType: 'channel',
    targetId: channel._id,
    scheduleType: 'daily',
    startTimeOfDay: '00:00',
    endTimeOfDay: '23:59',
    title: '24/7 Broadcast',
    description: 'Round-the-clock programming on Rhapsody TV.',
    timezone: 'Africa/Lagos',
    isActive: true,
  });

  console.log('Successfully seeded Rhapsody TV data (mock URLs removed).');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

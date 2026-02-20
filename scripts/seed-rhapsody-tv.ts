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
    await ChannelModel.deleteMany({ _id: { $in: mockChannelIds } });
    console.log(`Removed ${mockChannelIds.length} channel(s) with mock URLs.`);
  }

  await LiveStreamModel.deleteMany({
    $or: [{ thumbnailUrl: mockUrlPattern }, { playbackUrl: mockUrlPattern }],
  });
  await VideoModel.deleteMany({
    $or: [{ thumbnailUrl: mockUrlPattern }, { playbackUrl: mockUrlPattern }],
  });

  // Remove invalid program rows that can break homepage mapping.
  await ProgramModel.deleteMany({
    $or: [{ startTime: { $exists: false } }, { endTime: { $exists: false } }],
  });

  const existingChannel = await ChannelModel.findOne({ slug: 'rhapsody-tv' });
  if (existingChannel) {
    const channelId = existingChannel._id;
    await LiveStreamModel.deleteMany({ channelId });
    await VideoModel.deleteMany({ channelId });
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

  const liveStream2 = await LiveStreamModel.create({
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

  // 5. Create Programs
  console.log('Creating Programs...');
  const now = new Date();

  // Current program (linked to the live stream)
  await ProgramModel.create({
    channelId: channel._id,
    title: 'Rhapsody Daily',
    description: 'Daily devotional reading live.',
    startTime: new Date(now.getTime() - 15 * 60000), // Started 15 mins ago
    endTime: new Date(now.getTime() + 45 * 60000), // Ends in 45 mins
    durationInMinutes: 60,
    category: 'Devotional',
    isLive: true,
    viewerCount: 1200,
    liveStreamId: liveStream1._id,
  });

  // Past program (linked to a video)
  await ProgramModel.create({
    channelId: channel._id,
    title: 'Morning Inspiration',
    description: 'Start your day with the word.',
    startTime: new Date(now.getTime() - 3 * 60 * 60000), // 3 hours ago
    endTime: new Date(now.getTime() - 2 * 60 * 60000), // 2 hours ago
    durationInMinutes: 60,
    category: 'Inspiration',
    isLive: false,
    viewerCount: 0,
    videoId: videos[0]._id, // Linked to the first video
  });

  // Future program
  await ProgramModel.create({
    channelId: channel._id,
    title: 'Evening Praise',
    description: 'Worship session.',
    startTime: new Date(now.getTime() + 5 * 60 * 60000), // In 5 hours
    endTime: new Date(now.getTime() + 7 * 60 * 60000), // Ends in 7 hours
    durationInMinutes: 120,
    category: 'Worship',
    isLive: false,
    viewerCount: 0,
  });

  console.log('Successfully seeded Rhapsody TV data (mock URLs removed).');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

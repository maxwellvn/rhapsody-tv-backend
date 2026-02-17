import { registerAs } from '@nestjs/config';

export default registerAs('kingschat', () => ({
  profileUrl: process.env.KINGSCHAT_PROFILE_URL || 'https://connect.kingsch.at/api/profile',
  clientId: process.env.KINGSCHAT_CLIENT_ID || 'com.kingschat',
  clientVersion: process.env.KINGSCHAT_CLIENT_VERSION || 'web-2.0',
  deviceId: process.env.KINGSCHAT_DEVICE_ID || 'web',
  platform: process.env.KINGSCHAT_PLATFORM || 'web',
  requestTimeoutMs: parseInt(process.env.KINGSCHAT_REQUEST_TIMEOUT_MS ?? '10000', 10),
}));

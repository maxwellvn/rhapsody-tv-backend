import * as dotenv from 'dotenv';
import { registerAs } from '@nestjs/config';

dotenv.config();

console.log(`REDIS_URL: ${process.env.REDIS_URL}`);

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

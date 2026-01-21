import * as dotenv from 'dotenv';
import { registerAs } from '@nestjs/config';

dotenv.config();

export default registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

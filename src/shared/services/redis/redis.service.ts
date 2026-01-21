import { Injectable, OnModuleDestroy, Inject, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import Redis from 'ioredis';
import redisConfig from '../../../config/redis.config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(
    @Inject(redisConfig.KEY)
    private readonly config: ConfigType<typeof redisConfig>,
  ) {
    this.initializeClient();
  }

  private initializeClient() {
    // Skip Redis if URL is not configured or is localhost in production
    if (!this.config.url || this.config.url === 'redis://localhost:6379') {
      if (process.env.NODE_ENV === 'production') {
        this.logger.warn('Redis URL not configured - running without Redis cache');
        return;
      }
    }

    try {
      this.client = new Redis(this.config.url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn('Redis max retries reached, giving up');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.logger.warn(`Redis connection error: ${err.message}`);
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

      // Try to connect
      this.client.connect().catch((err) => {
        this.logger.warn(`Failed to connect to Redis: ${err.message}`);
        this.client = null;
      });
    } catch (error) {
      this.logger.warn(`Failed to initialize Redis: ${error}`);
      this.client = null;
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  getClient(): Redis | null {
    return this.client;
  }

  isAvailable(): boolean {
    return this.isConnected && this.client !== null;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.client!.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      if (ttlSeconds) {
        await this.client!.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.client!.set(key, value);
      }
    } catch {
      // Silently fail - cache is optional
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.del(key);
    } catch {
      // Silently fail
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isAvailable()) return false;
    try {
      const result = await this.client!.exists(key);
      return result === 1;
    } catch {
      return false;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.expire(key, ttlSeconds);
    } catch {
      // Silently fail
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (!this.isAvailable()) return [];
    try {
      return await this.client!.keys(pattern);
    } catch {
      return [];
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.hset(key, field, value);
    } catch {
      // Silently fail
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (!this.isAvailable()) return null;
    try {
      return await this.client!.hget(key, field);
    } catch {
      return null;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.isAvailable()) return {};
    try {
      return await this.client!.hgetall(key);
    } catch {
      return {};
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    if (!this.isAvailable()) return;
    try {
      await this.client!.hdel(key, field);
    } catch {
      // Silently fail
    }
  }
}

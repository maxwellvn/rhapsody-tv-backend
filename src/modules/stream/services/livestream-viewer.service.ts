import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/services/redis/redis.service';

@Injectable()
export class LivestreamViewerService {
  private readonly VIEWER_SET_PREFIX = 'livestream:viewers:';
  private readonly VIEWER_TTL_SECONDS = 3600; // 1 hour TTL for cleanup

  constructor(private readonly redisService: RedisService) {}

  /**
   * Get the Redis key for a livestream's viewer set
   */
  private getViewerKey(livestreamId: string): string {
    return `${this.VIEWER_SET_PREFIX}${livestreamId}`;
  }

  /**
   * Add a viewer to a livestream
   */
  async addViewer(livestreamId: string, userId: string): Promise<number> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    await client.sadd(key, userId);
    // Refresh TTL on activity
    await client.expire(key, this.VIEWER_TTL_SECONDS);

    return this.getViewerCount(livestreamId);
  }

  /**
   * Remove a viewer from a livestream
   */
  async removeViewer(livestreamId: string, userId: string): Promise<number> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    await client.srem(key, userId);

    return this.getViewerCount(livestreamId);
  }

  /**
   * Get the current viewer count for a livestream
   */
  async getViewerCount(livestreamId: string): Promise<number> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    return client.scard(key);
  }

  /**
   * Check if a user is currently viewing a livestream
   */
  async isViewing(livestreamId: string, userId: string): Promise<boolean> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    const result = await client.sismember(key, userId);
    return result === 1;
  }

  /**
   * Get all viewer IDs for a livestream
   */
  async getViewerIds(livestreamId: string): Promise<string[]> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    return client.smembers(key);
  }

  /**
   * Clear all viewers from a livestream (used when stream ends)
   */
  async clearViewers(livestreamId: string): Promise<void> {
    const key = this.getViewerKey(livestreamId);
    await this.redisService.del(key);
  }
}

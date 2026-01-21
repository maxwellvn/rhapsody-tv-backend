import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../shared/services/redis/redis.service';

@Injectable()
export class LivestreamViewerService {
  private readonly VIEWER_SET_PREFIX = 'livestream:viewers:';
  private readonly VIEWER_TTL_SECONDS = 3600; // 1 hour TTL for cleanup

  // In-memory fallback when Redis is not available
  private memoryViewers: Map<string, Set<string>> = new Map();

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

    if (client && this.redisService.isAvailable()) {
      await client.sadd(key, userId);
      await client.expire(key, this.VIEWER_TTL_SECONDS);
    } else {
      // Fallback to in-memory
      if (!this.memoryViewers.has(livestreamId)) {
        this.memoryViewers.set(livestreamId, new Set());
      }
      this.memoryViewers.get(livestreamId)!.add(userId);
    }

    return this.getViewerCount(livestreamId);
  }

  /**
   * Remove a viewer from a livestream
   */
  async removeViewer(livestreamId: string, userId: string): Promise<number> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    if (client && this.redisService.isAvailable()) {
      await client.srem(key, userId);
    } else {
      // Fallback to in-memory
      this.memoryViewers.get(livestreamId)?.delete(userId);
    }

    return this.getViewerCount(livestreamId);
  }

  /**
   * Get the current viewer count for a livestream
   */
  async getViewerCount(livestreamId: string): Promise<number> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    if (client && this.redisService.isAvailable()) {
      return client.scard(key);
    }
    
    // Fallback to in-memory
    return this.memoryViewers.get(livestreamId)?.size || 0;
  }

  /**
   * Check if a user is currently viewing a livestream
   */
  async isViewing(livestreamId: string, userId: string): Promise<boolean> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    if (client && this.redisService.isAvailable()) {
      const result = await client.sismember(key, userId);
      return result === 1;
    }
    
    // Fallback to in-memory
    return this.memoryViewers.get(livestreamId)?.has(userId) || false;
  }

  /**
   * Get all viewer IDs for a livestream
   */
  async getViewerIds(livestreamId: string): Promise<string[]> {
    const key = this.getViewerKey(livestreamId);
    const client = this.redisService.getClient();

    if (client && this.redisService.isAvailable()) {
      return client.smembers(key);
    }
    
    // Fallback to in-memory
    const viewers = this.memoryViewers.get(livestreamId);
    return viewers ? Array.from(viewers) : [];
  }

  /**
   * Clear all viewers from a livestream (used when stream ends)
   */
  async clearViewers(livestreamId: string): Promise<void> {
    const key = this.getViewerKey(livestreamId);
    await this.redisService.del(key);
    
    // Also clear in-memory
    this.memoryViewers.delete(livestreamId);
  }
}

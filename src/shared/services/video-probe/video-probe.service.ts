import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VideoMetadata {
  durationSeconds: number;
  width?: number;
  height?: number;
  codec?: string;
}

@Injectable()
export class VideoProbeService {
  private readonly logger = new Logger(VideoProbeService.name);

  /**
   * Get video duration from a URL using ffprobe
   * @param url - The video URL to probe
   * @returns Duration in seconds, or null if unable to determine
   */
  async getDuration(url: string): Promise<number | null> {
    try {
      // Use ffprobe to get video duration
      // -v error: Only show errors
      // -show_entries format=duration: Only show duration
      // -of default=noprint_wrappers=1:nokey=1: Output only the value
      const { stdout } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${url}"`,
        { timeout: 30000 }, // 30 second timeout
      );

      const duration = parseFloat(stdout.trim());
      if (!isNaN(duration) && duration > 0) {
        this.logger.log(`Got duration for video: ${Math.round(duration)}s`);
        return Math.round(duration);
      }

      return null;
    } catch (error) {
      this.logger.warn(`Failed to get video duration from ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Get full video metadata from a URL using ffprobe
   * @param url - The video URL to probe
   * @returns Video metadata including duration, dimensions, and codec
   */
  async getMetadata(url: string): Promise<VideoMetadata | null> {
    try {
      // Get comprehensive video info in JSON format
      const { stdout } = await execAsync(
        `ffprobe -v error -select_streams v:0 -show_entries stream=width,height,codec_name -show_entries format=duration -of json "${url}"`,
        { timeout: 30000 },
      );

      const data = JSON.parse(stdout);
      const format = data.format || {};
      const stream = data.streams?.[0] || {};

      const duration = parseFloat(format.duration);
      if (isNaN(duration) || duration <= 0) {
        return null;
      }

      return {
        durationSeconds: Math.round(duration),
        width: stream.width,
        height: stream.height,
        codec: stream.codec_name,
      };
    } catch (error) {
      this.logger.warn(`Failed to get video metadata from ${url}: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if ffprobe is available on the system
   */
  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('ffprobe -version', { timeout: 5000 });
      return true;
    } catch {
      this.logger.warn('ffprobe is not available on this system');
      return false;
    }
  }
}

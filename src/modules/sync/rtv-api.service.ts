import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  RtvApiResponse,
  RtvCategory,
  RtvCategoryBatch,
  RtvVideo,
} from './types/rtv-api.types';

const BASE_URL = 'https://rhapsodytv.live';
const HEADERS = {
  'Content-Type': 'application/json',
  Origin: BASE_URL,
  Referer: `${BASE_URL}/`,
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

@Injectable()
export class RtvApiService {
  private readonly logger = new Logger(RtvApiService.name);

  async fetchAllCategories(): Promise<RtvCategory[]> {
    const batches: RtvCategoryBatch[] = [
      'first',
      'second',
      'third',
      'fourth',
      'fifth',
      'sixth',
      'seventh',
    ];
    const seen = new Map<string, RtvCategory>();

    for (const batch of batches) {
      try {
        const { data } = await axios.post<RtvApiResponse<RtvCategory>>(
          `${BASE_URL}/api/fetch/categories`,
          { cat_batch: batch },
          { headers: HEADERS, timeout: 30000 },
        );
        if (data.status && data.response) {
          for (const cat of data.response) {
            if (!seen.has(cat.category_id)) {
              seen.set(cat.category_id, cat);
            }
          }
        }
      } catch (error) {
        this.logger.warn(`Failed to fetch batch "${batch}": ${error}`);
      }
    }

    return Array.from(seen.values());
  }

  async fetchVideosForCategory(categoryName: string): Promise<RtvVideo[]> {
    const hyphenated = categoryName.replace(/ /g, '-');
    try {
      const { data } = await axios.post<RtvApiResponse<RtvVideo>>(
        `${BASE_URL}/api/fetch/category_related`,
        { category_name: hyphenated },
        { headers: HEADERS, timeout: 30000 },
      );
      if (data.status && data.response) {
        return data.response;
      }
    } catch {
      // Try with original name as fallback
    }

    try {
      const { data } = await axios.post<RtvApiResponse<RtvVideo>>(
        `${BASE_URL}/api/fetch/category_related`,
        { category_name: categoryName },
        { headers: HEADERS, timeout: 30000 },
      );
      if (data.status && data.response) {
        return data.response;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch videos for "${categoryName}": ${error}`,
      );
    }

    return [];
  }

  async scrapeVideoUrl(videoId: string): Promise<string | null> {
    try {
      const { data: html } = await axios.get<string>(
        `${BASE_URL}/video/${videoId}`,
        {
          headers: { Referer: `${BASE_URL}/` },
          timeout: 30000,
          responseType: 'text',
        },
      );
      const match = html.match(
        /<source\s+type="video\/mp4"\s+src="([^"]+)"/,
      );
      return match ? match[1].trim() : null;
    } catch (error) {
      this.logger.warn(`Failed to scrape video URL for ${videoId}: ${error}`);
      return null;
    }
  }

  async fetchScheduleJs(): Promise<string | null> {
    try {
      const { data } = await axios.get<string>(
        `${BASE_URL}/views/js/programs.js`,
        { timeout: 30000, responseType: 'text' },
      );
      return data;
    } catch (error) {
      this.logger.warn(`Failed to fetch programs.js: ${error}`);
      return null;
    }
  }
}

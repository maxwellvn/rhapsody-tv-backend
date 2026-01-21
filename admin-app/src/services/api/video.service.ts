import { api } from './client';
import { API_ENDPOINTS } from '@/config/api.config';
import { 
  ApiResponse, 
  Video, 
  CreateVideoRequest, 
  UpdateVideoRequest,
  VideosListResponse,
  PaginationParams 
} from '@/types/api.types';

/**
 * Video Service
 * Handles video-related API calls
 */
class VideoService {
  /**
   * Get list of videos with pagination
   */
  async getVideos(params?: PaginationParams): Promise<ApiResponse<VideosListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.ADMIN_VIDEOS.LIST}?${queryString}`
      : API_ENDPOINTS.ADMIN_VIDEOS.LIST;
    
    return api.get<VideosListResponse>(url);
  }

  /**
   * Get video by ID
   */
  async getVideoById(id: string): Promise<ApiResponse<Video>> {
    return api.get<Video>(API_ENDPOINTS.ADMIN_VIDEOS.DETAILS(id));
  }

  /**
   * Create a new video
   */
  async createVideo(data: CreateVideoRequest): Promise<ApiResponse<Video>> {
    return api.post<Video>(API_ENDPOINTS.ADMIN_VIDEOS.CREATE, data);
  }

  /**
   * Update video
   */
  async updateVideo(id: string, data: UpdateVideoRequest): Promise<ApiResponse<Video>> {
    return api.patch<Video>(API_ENDPOINTS.ADMIN_VIDEOS.UPDATE(id), data);
  }

  /**
   * Delete video
   */
  async deleteVideo(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(API_ENDPOINTS.ADMIN_VIDEOS.DELETE(id));
  }
}

export const videoService = new VideoService();

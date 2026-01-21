import { api } from './client';
import { API_ENDPOINTS } from '@/config/api.config';
import { 
  ApiResponse, 
  Livestream, 
  CreateLivestreamRequest, 
  UpdateLivestreamRequest,
  UpdateLivestreamStatusRequest,
  LivestreamsListResponse,
  PaginationParams 
} from '@/types/api.types';

/**
 * Livestream Service
 * Handles livestream-related API calls
 */
class LivestreamService {
  /**
   * Get list of livestreams with pagination
   */
  async getLivestreams(params?: PaginationParams): Promise<ApiResponse<LivestreamsListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.ADMIN_LIVESTREAMS.LIST}?${queryString}`
      : API_ENDPOINTS.ADMIN_LIVESTREAMS.LIST;
    
    return api.get<LivestreamsListResponse>(url);
  }

  /**
   * Get livestream by ID
   */
  async getLivestreamById(id: string): Promise<ApiResponse<Livestream>> {
    return api.get<Livestream>(API_ENDPOINTS.ADMIN_LIVESTREAMS.DETAILS(id));
  }

  /**
   * Create a new livestream
   */
  async createLivestream(data: CreateLivestreamRequest): Promise<ApiResponse<Livestream>> {
    return api.post<Livestream>(API_ENDPOINTS.ADMIN_LIVESTREAMS.CREATE, data);
  }

  /**
   * Update livestream
   */
  async updateLivestream(id: string, data: UpdateLivestreamRequest): Promise<ApiResponse<Livestream>> {
    return api.patch<Livestream>(API_ENDPOINTS.ADMIN_LIVESTREAMS.UPDATE(id), data);
  }

  /**
   * Update livestream status
   */
  async updateLivestreamStatus(id: string, data: UpdateLivestreamStatusRequest): Promise<ApiResponse<Livestream>> {
    return api.patch<Livestream>(API_ENDPOINTS.ADMIN_LIVESTREAMS.UPDATE_STATUS(id), data);
  }

  /**
   * Delete livestream
   */
  async deleteLivestream(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(API_ENDPOINTS.ADMIN_LIVESTREAMS.DELETE(id));
  }
}

export const livestreamService = new LivestreamService();

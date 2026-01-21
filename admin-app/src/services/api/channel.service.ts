import { api } from './client';
import { API_ENDPOINTS } from '@/config/api.config';
import { 
  ApiResponse, 
  Channel, 
  ChannelsListResponse,
  CreateChannelRequest, 
  UpdateChannelRequest,
  PaginationParams 
} from '@/types/api.types';

/**
 * Channel Service
 * Handles channel-related API calls
 */
class ChannelService {
  /**
   * Get list of channels with pagination
   */
  async getChannels(params?: PaginationParams): Promise<ApiResponse<ChannelsListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.ADMIN_CHANNELS.LIST}?${queryString}`
      : API_ENDPOINTS.ADMIN_CHANNELS.LIST;
    
    return api.get<ChannelsListResponse>(url);
  }

  /**
   * Get channel by ID
   */
  async getChannelById(id: string): Promise<ApiResponse<Channel>> {
    return api.get<Channel>(API_ENDPOINTS.ADMIN_CHANNELS.DETAILS(id));
  }

  /**
   * Create a new channel
   */
  async createChannel(data: CreateChannelRequest): Promise<ApiResponse<Channel>> {
    return api.post<Channel>(API_ENDPOINTS.ADMIN_CHANNELS.CREATE, data);
  }

  /**
   * Update channel
   */
  async updateChannel(id: string, data: UpdateChannelRequest): Promise<ApiResponse<Channel>> {
    return api.patch<Channel>(API_ENDPOINTS.ADMIN_CHANNELS.UPDATE(id), data);
  }

  /**
   * Delete channel
   */
  async deleteChannel(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(API_ENDPOINTS.ADMIN_CHANNELS.DELETE(id));
  }
}

export const channelService = new ChannelService();

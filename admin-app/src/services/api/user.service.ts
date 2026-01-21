import { API_ENDPOINTS } from '@/config/api.config';
import {
  ApiResponse,
  CreateUserRequest,
  PaginationParams,
  UpdateUserRequest,
  User,
  UsersListResponse
} from '@/types/api.types';
import { api } from './client';

/**
 * User Service
 * Handles user-related API calls (Admin only)
 * Note: Endpoints are at /v1/users, not /v1/admin/users
 */
class UserService {
  /**
   * Get list of users with pagination
   */
  async getUsers(params?: PaginationParams): Promise<ApiResponse<UsersListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.USERS.LIST}?${queryString}`
      : API_ENDPOINTS.USERS.LIST;
    
    return api.get<UsersListResponse>(url);
  }

  /**
   * Get current signed-in user profile (/users/me)
   */
  async getMe(): Promise<ApiResponse<User>> {
    return api.get<User>(API_ENDPOINTS.USERS.ME);
  }

  /**
   * Update current signed-in user profile (/users/me)
   */
  async updateMe(data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return api.patch<User>(API_ENDPOINTS.USERS.UPDATE_ME, data);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<ApiResponse<User>> {
    return api.get<User>(API_ENDPOINTS.USERS.DETAILS(id));
  }

  /**
   * Create a new user
   */
  async createUser(data: CreateUserRequest): Promise<ApiResponse<User>> {
    return api.post<User>(API_ENDPOINTS.USERS.CREATE, data);
  }

  /**
   * Update user
   */
  async updateUser(id: string, data: UpdateUserRequest): Promise<ApiResponse<User>> {
    return api.patch<User>(API_ENDPOINTS.USERS.UPDATE(id), data);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(API_ENDPOINTS.USERS.DELETE(id));
  }
}

export const userService = new UserService();

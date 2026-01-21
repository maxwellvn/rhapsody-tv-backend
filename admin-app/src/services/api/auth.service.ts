import { api } from './client';
import { API_ENDPOINTS } from '@/config/api.config';
import { LoginRequest, AuthResponse, ApiResponse } from '@/types/api.types';

/**
 * Authentication Service
 * Handles admin authentication API calls
 */
class AuthService {
  /**
   * Login admin user
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return api.post<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, credentials);
  }

  /**
   * Logout admin user
   */
  async logout(): Promise<ApiResponse<void>> {
    return api.post<void>(API_ENDPOINTS.AUTH.LOGOUT);
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return api.post<AuthResponse>(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
      refreshToken,
    });
  }
}

export const authService = new AuthService();

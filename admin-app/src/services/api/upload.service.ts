import { api } from './client';
import { API_ENDPOINTS } from '@/config/api.config';
import { 
  ApiResponse, 
  UploadResponse,
  UploadFromUrlRequest 
} from '@/types/api.types';

/**
 * Upload Service
 * Handles file upload operations
 */
class UploadService {
  /**
   * Upload an image file
   */
  async uploadImage(file: File, onUploadProgress?: (progressEvent: any) => void): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.upload<UploadResponse>(
      API_ENDPOINTS.ADMIN_UPLOAD.IMAGE,
      formData,
      onUploadProgress
    );
  }

  /**
   * Upload a video file
   */
  async uploadVideo(file: File, onUploadProgress?: (progressEvent: any) => void): Promise<ApiResponse<UploadResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.upload<UploadResponse>(
      API_ENDPOINTS.ADMIN_UPLOAD.VIDEO,
      formData,
      onUploadProgress
    );
  }

  /**
   * Upload a file from URL
   */
  async uploadFromUrl(data: UploadFromUrlRequest): Promise<ApiResponse<UploadResponse>> {
    return api.post<UploadResponse>(API_ENDPOINTS.ADMIN_UPLOAD.FROM_URL, data);
  }
}

export const uploadService = new UploadService();

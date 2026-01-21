import { api } from './client';
import { API_ENDPOINTS } from '@/config/api.config';
import { 
  ApiResponse, 
  Program, 
  CreateProgramRequest, 
  UpdateProgramRequest,
  ProgramsListResponse,
  PaginationParams,
  ScheduleType,
} from '@/types/api.types';

interface ProgramsParams extends PaginationParams {
  scheduleType?: ScheduleType;
}

/**
 * Program Service
 * Handles program-related API calls
 */
class ProgramService {
  /**
   * Get list of programs with pagination and filtering
   */
  async getPrograms(params?: ProgramsParams): Promise<ApiResponse<ProgramsListResponse>> {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.scheduleType) queryParams.append('scheduleType', params.scheduleType);
    
    const queryString = queryParams.toString();
    const url = queryString 
      ? `${API_ENDPOINTS.ADMIN_PROGRAMS.LIST}?${queryString}`
      : API_ENDPOINTS.ADMIN_PROGRAMS.LIST;
    
    return api.get<ProgramsListResponse>(url);
  }

  /**
   * Get program by ID
   */
  async getProgramById(id: string): Promise<ApiResponse<Program>> {
    return api.get<Program>(API_ENDPOINTS.ADMIN_PROGRAMS.DETAILS(id));
  }

  /**
   * Create a new program
   */
  async createProgram(data: CreateProgramRequest): Promise<ApiResponse<Program>> {
    return api.post<Program>(API_ENDPOINTS.ADMIN_PROGRAMS.CREATE, data);
  }

  /**
   * Update program
   */
  async updateProgram(id: string, data: UpdateProgramRequest): Promise<ApiResponse<Program>> {
    return api.patch<Program>(API_ENDPOINTS.ADMIN_PROGRAMS.UPDATE(id), data);
  }

  /**
   * Delete program
   */
  async deleteProgram(id: string): Promise<ApiResponse<void>> {
    return api.delete<void>(API_ENDPOINTS.ADMIN_PROGRAMS.DELETE(id));
  }
}

export const programService = new ProgramService();

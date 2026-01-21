/**
 * Common API Response Types
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Channels list response (matches GET /admin/channels)
 */
export interface ChannelsListResponse {
  channels: Channel[];
  total: number;
  pages: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
}

/**
 * Pagination Parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

/**
 * Authentication Types
 */
export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  isEmailVerified: boolean;
}

/**
 * Channel Types
 */
export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  subscriberCount: number;
  videoCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelRequest {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  isActive?: boolean;
}

export interface UpdateChannelRequest extends Partial<CreateChannelRequest> {}

/**
 * User Types
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  roles: ('user' | 'admin')[];
  isActive: boolean;
  isEmailVerified: boolean;
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  roles?: ('user' | 'admin')[];
}

export interface UpdateUserRequest {
  fullName?: string;
  roles?: ('user' | 'admin')[];
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface UsersListResponse {
  users: User[];
  total: number;
  pages: number;
}

/**
 * Video Types
 */
export interface Video {
  id: string;
  channelId: string | { _id: string; name: string; slug: string };
  programId?: string | { _id: string; title: string };
  title: string;
  description?: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  visibility: 'public' | 'unlisted' | 'private';
  viewCount: number;
  isActive: boolean;
  isFeatured?: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVideoRequest {
  channelId: string;
  programId?: string;
  title: string;
  description?: string;
  playbackUrl: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  visibility?: 'public' | 'unlisted' | 'private';
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateVideoRequest extends Partial<Omit<CreateVideoRequest, 'channelId'>> {}

export interface VideosListResponse {
  videos: Video[];
  total: number;
  pages: number;
}

/**
 * Program Types
 */

// Schedule type determines how the program is scheduled
export type ScheduleType = 'daily' | 'weekly' | 'once';

// Days of the week for weekly scheduling
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
] as const;

export interface Program {
  id: string;
  channelId: string | { _id: string; name: string; slug: string; logoUrl?: string };
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  // For daily/weekly schedules: time of day (HH:mm format)
  startTimeOfDay?: string;
  endTimeOfDay?: string;
  // For weekly schedules: which days (0=Sunday, 6=Saturday)
  daysOfWeek?: number[];
  // For once: specific date/time. For daily/weekly: optional effective date range
  startTime?: string;
  endTime?: string;
  durationInMinutes?: number;
  timezone?: string;
  category?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProgramRequest {
  channelId: string;
  title: string;
  description?: string;
  scheduleType: ScheduleType;
  // For daily/weekly schedules
  startTimeOfDay?: string;
  endTimeOfDay?: string;
  // For weekly schedules
  daysOfWeek?: number[];
  // For once: required. For daily/weekly: optional effective date range
  startTime?: string;
  endTime?: string;
  timezone?: string;
  category?: string;
  thumbnailUrl?: string;
}

export interface UpdateProgramRequest extends Partial<Omit<CreateProgramRequest, 'channelId'>> {}

export interface ProgramsListResponse {
  programs: Program[];
  total: number;
  pages: number;
}

/**
 * Livestream Types
 */
export type LivestreamScheduleType = 'continuous' | 'scheduled';

export interface Livestream {
  id: string;
  channelId: string | { _id: string; name: string; slug: string };
  programId?: string | { _id: string; name: string; slug: string };
  title: string;
  description?: string;
  scheduleType: LivestreamScheduleType;
  status: 'scheduled' | 'live' | 'ended' | 'canceled';
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  startedAt?: string;
  endedAt?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  rtmpUrl?: string;
  streamKey?: string;
  isChatEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLivestreamRequest {
  channelId: string;
  programId?: string;
  title: string;
  description?: string;
  scheduleType?: LivestreamScheduleType;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  isChatEnabled?: boolean;
}

export interface UpdateLivestreamRequest {
  programId?: string;
  title?: string;
  description?: string;
  scheduleType?: LivestreamScheduleType;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  thumbnailUrl?: string;
  playbackUrl?: string;
  isChatEnabled?: boolean;
}

export interface UpdateLivestreamStatusRequest {
  status: 'scheduled' | 'live' | 'ended' | 'canceled';
}

export interface LivestreamsListResponse {
  livestreams: Livestream[];
  total: number;
  pages: number;
}

/**
 * Upload Types
 */
export interface UploadResponse {
  fileId: string;
  name: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  size: number;
  contentType: string;
}

export interface UploadFromUrlRequest {
  url: string;
}

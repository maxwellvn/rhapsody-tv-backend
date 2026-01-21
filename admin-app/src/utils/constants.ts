/**
 * Application Constants
 */

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Rhapsody TV Admin';

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  LIMIT_OPTIONS: [10, 20, 50, 100],
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'rhapsody_admin_access_token',
  REFRESH_TOKEN: 'rhapsody_admin_refresh_token',
  USER_DATA: 'rhapsody_admin_user_data',
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  USER_DETAIL: (id: string) => `/users/${id}`,
  CHANNELS: '/channels',
  CHANNEL_DETAIL: (id: string) => `/channels/${id}`,
  VIDEOS: '/videos',
  VIDEO_DETAIL: (id: string) => `/videos/${id}`,
  PROGRAMS: '/programs',
  PROGRAM_DETAIL: (id: string) => `/programs/${id}`,
  LIVESTREAMS: '/livestreams',
  LIVESTREAM_DETAIL: (id: string) => `/livestreams/${id}`,
} as const;

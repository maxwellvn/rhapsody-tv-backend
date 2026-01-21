/**
 * API Configuration
 */

// In production, admin app is served from the same origin as the backend
// So we can use relative URLs (just /v1)
const getBaseUrl = () => {
  // If env variable is set, use it
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // In production (served from backend), use same origin
  if (import.meta.env.PROD) {
    return '/v1';
  }
  // In development, default to local backend
  return 'http://localhost:3000/v1';
};

export const API_CONFIG = {
  // Backend API base URL
  BASE_URL: getBaseUrl(),
  
  // Timeout duration in milliseconds
  TIMEOUT: 30000,
  
  // API version
  VERSION: 'v1',
} as const;

export const API_ENDPOINTS = {
  // Authentication (uses same endpoints as mobile - backend doesn't have separate admin auth)
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh',
  },
  
  // Users (Admin only per docs, but not under /admin)
  USERS: {
    LIST: '/users',
    ME: '/users/me',
    DETAILS: (id: string) => `/users/${id}`,
    CREATE: '/users',
    UPDATE: (id: string) => `/users/${id}`,
    DELETE: (id: string) => `/users/${id}`,
    UPDATE_ME: '/users/me',
  },
  
  // Admin Channels
  ADMIN_CHANNELS: {
    LIST: '/admin/channels',
    DETAILS: (id: string) => `/admin/channels/${id}`,
    CREATE: '/admin/channels',
    UPDATE: (id: string) => `/admin/channels/${id}`,
    DELETE: (id: string) => `/admin/channels/${id}`,
  },
  
  // Admin Videos
  ADMIN_VIDEOS: {
    LIST: '/admin/videos',
    DETAILS: (id: string) => `/admin/videos/${id}`,
    CREATE: '/admin/videos',
    UPDATE: (id: string) => `/admin/videos/${id}`,
    DELETE: (id: string) => `/admin/videos/${id}`,
  },
  
  // Admin Programs
  ADMIN_PROGRAMS: {
    LIST: '/admin/programs',
    DETAILS: (id: string) => `/admin/programs/${id}`,
    CREATE: '/admin/programs',
    UPDATE: (id: string) => `/admin/programs/${id}`,
    DELETE: (id: string) => `/admin/programs/${id}`,
  },
  
  // Admin Livestreams
  ADMIN_LIVESTREAMS: {
    LIST: '/admin/livestreams',
    DETAILS: (id: string) => `/admin/livestreams/${id}`,
    CREATE: '/admin/livestreams',
    UPDATE: (id: string) => `/admin/livestreams/${id}`,
    DELETE: (id: string) => `/admin/livestreams/${id}`,
    UPDATE_STATUS: (id: string) => `/admin/livestreams/${id}/status`,
  },
  
  // Admin Upload
  ADMIN_UPLOAD: {
    IMAGE: '/admin/upload/image',
    VIDEO: '/admin/upload/video',
    FROM_URL: '/admin/upload/from-url',
  },
} as const;

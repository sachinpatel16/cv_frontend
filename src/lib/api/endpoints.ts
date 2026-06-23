export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  PEOPLEFIND: {
    MEDIA: '/peoplefind/media',
    SEARCH: '/peoplefind/search',
    SEARCH_VIDEO: '/peoplefind/search-video',
    SESSIONS: '/peoplefind/sessions',
    SESSIONS_HISTORY: '/peoplefind/sessions/history',
  },
  SMOKINGDETECT: {
    UPLOAD: '/smokingdetect/upload',
    SESSIONS: '/smokingdetect/sessions',
    SESSIONS_HISTORY: '/smokingdetect/sessions/history',
  },
} as const;

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
  PEOPLECOUNT: {
    MEDIA: '/peoplecount/media',
  },
  OBJECTCOUNT: {
    MEDIA: '/objectcount/media',
  },
  PEOPLEANALYTICS: {
    UPLOAD: '/peopleanalytics/upload',
    UPLOADS: '/peopleanalytics/uploads',
    PROCESS: '/peopleanalytics/process',
    SESSIONS: '/peopleanalytics/sessions',
    VISITORS: '/peopleanalytics/visitors',
  },
  EMPLOYEES: {
    BASE: '/employees',
    ATTENDANCE: '/employees/attendance',
    ATTENDANCE_PHOTO: '/employees/attendance/photo',
    ATTENDANCE_VIDEO_UPLOAD: '/employees/attendance/video/upload',
    ATTENDANCE_VIDEO_UPLOADS: '/employees/attendance/video/uploads',
    ATTENDANCE_VIDEO_PROCESS: '/employees/attendance/video/process',
    ATTENDANCE_VIDEO_SESSIONS: '/employees/attendance/video/sessions',
  },
  SMOKINGDETECT: {
    UPLOAD: '/smokingdetect/upload',
    SESSIONS: '/smokingdetect/sessions',
    SESSIONS_HISTORY: '/smokingdetect/sessions/history',
  },
} as const;

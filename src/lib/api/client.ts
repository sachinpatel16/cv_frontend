import axios from 'axios';
import { signOut } from 'next-auth/react';
import { API_ENDPOINTS } from './endpoints';

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Flag to prevent multiple concurrent token refresh requests
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

// Reusable 401 handler
const handle401Error = async (error: any) => {
  const originalRequest = error.config;
  console.log(
    '[Auth Interceptor] Handling 401 error for URL:',
    originalRequest.url,
  );

  // Check if it's already an auth request
  const isAuthRequest =
    originalRequest.url?.includes(API_ENDPOINTS.AUTH.LOGIN) ||
    originalRequest.url?.includes(API_ENDPOINTS.AUTH.REGISTER) ||
    originalRequest.url?.includes(API_ENDPOINTS.AUTH.REFRESH);

  if (isAuthRequest) {
    console.log(
      '[Auth Interceptor] 401 occurred during an auth request. Bypassing refresh to prevent loop.',
    );
    return Promise.reject(error);
  }

  if (originalRequest._retry) {
    console.log(
      '[Auth Interceptor] Request has already been retried once. Rejecting to prevent loop.',
    );
    return Promise.reject(error);
  }

  // If a refresh is already in progress, queue the request
  if (isRefreshing) {
    console.log(
      '[Auth Interceptor] Token refresh already in progress. Queueing request:',
      originalRequest.url,
    );
    return new Promise((resolve, reject) => {
      failedQueue.push({ resolve, reject });
    })
      .then(() => {
        console.log(
          '[Auth Interceptor] Queue processed. Retrying queued request:',
          originalRequest.url,
        );
        return apiClient(originalRequest);
      })
      .catch((err) => Promise.reject(err));
  }

  originalRequest._retry = true;
  isRefreshing = true;

  try {
    console.log('[Auth Interceptor] Initiating silent token refresh...');
    // Using our configured apiClient to keep things modular and reuse headers/cookies
    await apiClient.post(API_ENDPOINTS.AUTH.REFRESH);
    console.log(
      '[Auth Interceptor] Silent token refresh succeeded! Retrying original request...',
    );

    isRefreshing = false;
    processQueue(null);
    return apiClient(originalRequest);
  } catch (refreshError) {
    console.error(
      '[Auth Interceptor] Silent token refresh failed. User session is invalid. Logging out...',
      refreshError,
    );
    isRefreshing = false;
    processQueue(refreshError);

    // If refresh fails, log the user out on the client side
    if (typeof window !== 'undefined') {
      console.log('[Auth Interceptor] Calling NextAuth signOut()...');
      signOut({ callbackUrl: '/login' });
    }
    return Promise.reject(refreshError);
  }
};

const normalizePaths = (obj: any): any => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    if (
      obj.includes('\\') &&
      (obj.includes('storage') ||
        obj.includes('outputs') ||
        obj.includes('inputs'))
    ) {
      return obj.replace(/\\/g, '/');
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(normalizePaths);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = normalizePaths(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
};

apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = normalizePaths(response.data);
    }
    // Case 1: Backend returns HTTP 200 OK but with an unauthenticated status in the body
    if (response.data && response.data.status === 401) {
      console.warn(
        '[Auth Interceptor] Unauthenticated detected in 200 OK response body:',
        response.data,
      );
      const customError = new Error('Unauthenticated') as any;
      customError.response = response;
      customError.config = response.config;
      return handle401Error(customError);
    }
    return response;
  },
  async (error) => {
    // Case 2: Backend returns a true HTTP 401 status code
    console.warn(
      '[Auth Interceptor] Unauthenticated detected via HTTP 401 status code for:',
      error.config?.url,
    );
    if (error.response?.status === 401) {
      return handle401Error(error);
    }
    return Promise.reject(error);
  },
);

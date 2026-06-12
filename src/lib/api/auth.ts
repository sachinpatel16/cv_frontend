import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  LoginRequest,
  RegisterRequest,
  ChangePasswordRequest,
  AuthUser,
} from '@/types/auth';

/**
 * Parse FastAPI / backend error responses into user-friendly messages.
 * FastAPI validation errors come as: { detail: [{ loc: [...], msg: "...", type: "..." }] }
 * Regular errors come as: { detail: "string" } or { message: "string" }
 */
function parseApiError(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;

  const d = data as Record<string, unknown>;

  // FastAPI validation errors: detail is an array
  if (Array.isArray(d.detail)) {
    const messages = d.detail.map((err: { loc?: string[]; msg?: string }) => {
      const field = err.loc?.filter((l) => l !== 'body').pop() ?? '';
      const msg = err.msg ?? '';
      const label = field
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase());
      return label ? `${label}: ${msg}` : msg;
    });
    return messages.join('\n');
  }

  // FastAPI single error: detail is a string
  if (typeof d.detail === 'string') return d.detail;

  // Standard format: { message: "..." }
  if (typeof d.message === 'string') return d.message;

  return fallback;
}

/**
 * Login — calls backend directly. The backend sets HttpOnly cookies
 * (access_token, refresh_token) via Set-Cookie headers.
 * Returns the user profile from the response body.
 */
export async function login(
  data: LoginRequest,
): Promise<ApiResponse<AuthUser>> {
  try {
    const response = await apiClient.post<ApiResponse<AuthUser>>(
      API_ENDPOINTS.AUTH.LOGIN,
      data,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        parseApiError(error.response?.data, 'Login failed'),
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/**
 * Register — calls backend directly. The backend sets HttpOnly cookies
 * (access_token, refresh_token) via Set-Cookie headers.
 * Returns the user profile from the response body.
 */
export async function register(
  data: RegisterRequest,
): Promise<ApiResponse<AuthUser>> {
  try {
    const response = await apiClient.post<ApiResponse<AuthUser>>(
      API_ENDPOINTS.AUTH.REGISTER,
      data,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        parseApiError(error.response?.data, 'Registration failed'),
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/**
 * Logout — tells the backend to clear the HttpOnly cookies.
 */
export async function logout(): Promise<void> {
  try {
    await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        parseApiError(error.response?.data, 'Logout failed'),
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/**
 * Get current user profile — authenticated via cookie.
 */
export async function getMe(): Promise<ApiResponse<AuthUser>> {
  try {
    const response = await apiClient.get<ApiResponse<AuthUser>>(
      API_ENDPOINTS.AUTH.ME,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        parseApiError(error.response?.data, 'Failed to fetch profile'),
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/**
 * Refresh tokens — backend reads refresh_token cookie and sets new cookies.
 */
export async function refreshTokens(): Promise<ApiResponse<AuthUser>> {
  try {
    const response = await apiClient.post<ApiResponse<AuthUser>>(
      API_ENDPOINTS.AUTH.REFRESH,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        parseApiError(error.response?.data, 'Token refresh failed'),
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/**
 * Change password — authenticated via cookie.
 */
export async function changePassword(
  data: ChangePasswordRequest,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.post<ApiResponse<null>>(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      data,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        parseApiError(error.response?.data, 'Password change failed'),
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

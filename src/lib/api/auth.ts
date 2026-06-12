import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { LoginRequest, RegisterRequest, AuthTokens } from '@/types/auth';

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
      // Capitalize field name and make it readable
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

export async function login(
  data: LoginRequest,
): Promise<ApiResponse<AuthTokens>> {
  try {
    const response = await apiClient.post<ApiResponse<AuthTokens>>(
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

export async function register(
  data: RegisterRequest,
): Promise<ApiResponse<AuthTokens>> {
  try {
    console.log('Inside Register', data);
    console.log('endpoint', API_ENDPOINTS.AUTH.REGISTER);
    const response = await apiClient.post<ApiResponse<AuthTokens>>(
      API_ENDPOINTS.AUTH.REGISTER,
      data,
    );
    console.log('RESPONSE', response);
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

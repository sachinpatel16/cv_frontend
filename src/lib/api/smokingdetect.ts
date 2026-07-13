import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  SmokingSession,
  SmokingEvent,
  SmokingSessionHistoryItem,
} from '@/types/smokingdetect';

/** Upload a video for background smoking detection analysis */
export async function uploadVideoForAnalysis(
  file: File,
  interval = 1.0,
): Promise<ApiResponse<SmokingSession>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('interval', String(interval));

    const response = await apiClient.post<ApiResponse<SmokingSession>>(
      API_ENDPOINTS.SMOKINGDETECT.UPLOAD,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Video upload failed',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Poll the status and events of a smoking detection session */
export async function getSmokingSessionStatus(
  sessionId: string,
): Promise<ApiResponse<SmokingSession>> {
  try {
    const response = await apiClient.get<ApiResponse<SmokingSession>>(
      `${API_ENDPOINTS.SMOKINGDETECT.SESSIONS}/${sessionId}/status`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch session status',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get all detected events for a completed session, sorted by timestamp */
export async function getSmokingSessionEvents(
  sessionId: string,
): Promise<ApiResponse<SmokingEvent[]>> {
  try {
    const response = await apiClient.get<ApiResponse<SmokingEvent[]>>(
      `${API_ENDPOINTS.SMOKINGDETECT.SESSIONS}/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch session events',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get smoking detection session history for the current user / tenant */
export async function getSmokingSessionHistory(): Promise<
  ApiResponse<SmokingSessionHistoryItem[]>
> {
  try {
    const response = await apiClient.get<
      ApiResponse<SmokingSessionHistoryItem[]>
    >(API_ENDPOINTS.SMOKINGDETECT.SESSIONS_HISTORY);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch session history',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/**
 * Returns the streaming URL for the annotated output video.
 * Only valid once session.status === 'completed'.
 */
export function getAnnotatedVideoUrl(sessionId: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  return `${base}/api/v1/smokingdetect/sessions/${sessionId}/video`;
}

/** Delete a smoking detection session and its associated data */
export async function deleteSmokingSession(
  sessionId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.SMOKINGDETECT.SESSIONS}/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to delete smoking session',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Trigger smoking detection analysis by referencing a gallery media ID */
export async function triggerSmokingAnalysis(
  galleryMediaId: string,
  interval = 1.0,
): Promise<ApiResponse<SmokingSession>> {
  try {
    const response = await apiClient.post<ApiResponse<SmokingSession>>(
      '/smokingdetect/analyze',
      { gallery_media_id: galleryMediaId, interval },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to trigger smoking analysis',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

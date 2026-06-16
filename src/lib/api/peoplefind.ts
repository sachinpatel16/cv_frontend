import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  MediaSource,
  SearchSession,
  SearchMatch,
  SessionHistoryItem,
} from '@/types/peoplefind';

// ── Media Library ──

/** Upload & index one or more photos/videos */
export async function uploadMedia(
  files: File[],
  mediaType: 'photo' | 'video',
): Promise<ApiResponse<MediaSource[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('media_type', mediaType);

    const response = await apiClient.post<ApiResponse<MediaSource[]>>(
      API_ENDPOINTS.PEOPLEFIND.MEDIA,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Media upload failed',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** List all indexed media for the current tenant */
export async function listMedia(): Promise<ApiResponse<MediaSource[]>> {
  try {
    const response = await apiClient.get<ApiResponse<MediaSource[]>>(
      API_ENDPOINTS.PEOPLEFIND.MEDIA,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Delete a single media item */
export async function deleteMedia(mediaId: string): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.PEOPLEFIND.MEDIA}/${mediaId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to delete media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Bulk-delete all media for the current tenant */
export async function bulkDeleteMedia(): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.PEOPLEFIND.MEDIA,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to delete all media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

// ── Search ──

/** Search all indexed media by uploading a reference selfie image */
export async function searchBySelfie(
  file: File,
  threshold = 0.45,
): Promise<ApiResponse<SearchSession>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('threshold', String(threshold));

    const response = await apiClient.post<ApiResponse<SearchSession>>(
      API_ENDPOINTS.PEOPLEFIND.SEARCH,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Search failed',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Submit a background search job for a specific video */
export async function searchVideo(
  file: File,
  videoId: string,
  threshold = 0.45,
): Promise<ApiResponse<SearchSession>> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('video_id', videoId);
    formData.append('threshold', String(threshold));

    const response = await apiClient.post<ApiResponse<SearchSession>>(
      API_ENDPOINTS.PEOPLEFIND.SEARCH_VIDEO,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Video search failed',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get results for a search session (poll for async video searches) */
export async function getSessionMatches(
  sessionId: string,
): Promise<ApiResponse<SearchMatch[]>> {
  try {
    const response = await apiClient.get<ApiResponse<SearchMatch[]>>(
      `${API_ENDPOINTS.PEOPLEFIND.SESSIONS}/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch session results',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get search session history for the current user / tenant */
export async function getSessionHistory(): Promise<
  ApiResponse<SessionHistoryItem[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<SessionHistoryItem[]>>(
      API_ENDPOINTS.PEOPLEFIND.SESSIONS_HISTORY,
    );
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

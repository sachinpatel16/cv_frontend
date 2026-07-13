import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  ActivityMedia,
  ActivityProcessStatus,
  ActivityAlert,
  ActivityAlertSummary,
  ActivityProcessPayload,
} from '@/types/activity';

/** Upload one or more photo/video files for activity detection */
export async function uploadActivityMedia(
  files: File[],
  mediaType: 'photo' | 'video',
): Promise<ApiResponse<ActivityMedia[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('media_type', mediaType);

    const response = await apiClient.post<ApiResponse<ActivityMedia[]>>(
      API_ENDPOINTS.ACTIVITY.MEDIA,
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

/** List all activity media uploads for the current tenant */
export async function listActivityMedia(): Promise<
  ApiResponse<ActivityMedia[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<ActivityMedia[]>>(
      API_ENDPOINTS.ACTIVITY.MEDIA,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to list media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get a single media record's detail */
export async function getActivityMediaDetail(
  mediaId: string,
): Promise<ApiResponse<ActivityMedia>> {
  try {
    const response = await apiClient.get<ApiResponse<ActivityMedia>>(
      `${API_ENDPOINTS.ACTIVITY.MEDIA}/${mediaId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch media detail',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Trigger (or re-trigger) activity detection on an uploaded media file */
export async function processActivityMedia(
  mediaId: string,
  payload: ActivityProcessPayload,
): Promise<ApiResponse<ActivityMedia>> {
  try {
    const response = await apiClient.post<ApiResponse<ActivityMedia>>(
      API_ENDPOINTS.ACTIVITY.PROCESS,
      { gallery_media_id: mediaId, ...payload },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to start processing',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Poll processing status and active config for a media file */
export async function getActivityProcessStatus(
  mediaId: string,
): Promise<ApiResponse<ActivityProcessStatus>> {
  try {
    const response = await apiClient.get<ApiResponse<ActivityProcessStatus>>(
      `${API_ENDPOINTS.ACTIVITY.PROCESS}/${mediaId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch process status',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get all alerts generated for a specific media file */
export async function getActivityProcessHistory(
  mediaId: string,
): Promise<ApiResponse<ActivityAlert[]>> {
  try {
    const response = await apiClient.get<ApiResponse<ActivityAlert[]>>(
      `${API_ENDPOINTS.ACTIVITY.PROCESS}/${mediaId}/history`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch process history',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Delete an activity media record and its associated data */
export async function deleteActivityMedia(
  mediaId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.ACTIVITY.MEDIA}/${mediaId}`,
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

/** Get alerts report, with optional filters */
export async function getActivityAlertsReport(filters?: {
  mediaId?: string;
  activityType?: string;
  severity?: string;
}): Promise<ApiResponse<ActivityAlert[]>> {
  try {
    const params: Record<string, string> = {};
    if (filters?.mediaId) params.media_id = filters.mediaId;
    if (filters?.activityType) params.activity_type = filters.activityType;
    if (filters?.severity) params.severity = filters.severity;

    const response = await apiClient.get<ApiResponse<ActivityAlert[]>>(
      API_ENDPOINTS.ACTIVITY.REPORT,
      { params },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch alerts report',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get aggregated alert summary for the tenant */
export async function getActivityAlertsSummary(
  mediaId?: string,
): Promise<ApiResponse<ActivityAlertSummary>> {
  try {
    const params: Record<string, string> = {};
    if (mediaId) params.media_id = mediaId;

    const response = await apiClient.get<ApiResponse<ActivityAlertSummary>>(
      API_ENDPOINTS.ACTIVITY.REPORT_SUMMARY,
      { params },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch alerts summary',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Returns the static URL for an annotated output video or photo */
export function getActivityOutputUrl(outputFilepath: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  return `${base}/${outputFilepath}`;
}

import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  UploadedVideo,
  AnalyticsSession,
  DetectedPerson,
  VisitorAnalytics,
  ProcessSessionPayload,
  VisitorAttendanceResponse,
} from '@/types/peopleanalytics';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function handleError(error: unknown, fallback: string): never {
  if (error instanceof AxiosError) {
    throw new ApiError(
      error.response?.data?.message || fallback,
      error.response?.status,
    );
  }
  throw new ApiError('An unexpected error occurred');
}

// ── Upload ──

/** Upload up to 10 raw CCTV video files */
export async function uploadCCTVFootage(
  files: File[],
): Promise<ApiResponse<UploadedVideo[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const response = await apiClient.post<ApiResponse<UploadedVideo[]>>(
      API_ENDPOINTS.PEOPLEANALYTICS.UPLOAD,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Upload failed');
  }
}

/** List all uploaded (unprocessed) videos */
export async function listUploadedVideos(): Promise<
  ApiResponse<UploadedVideo[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<UploadedVideo[]>>(
      API_ENDPOINTS.PEOPLEANALYTICS.UPLOADS,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch uploaded videos');
  }
}

/** Delete a single uploaded video */
export async function deleteUploadedVideo(
  videoId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.PEOPLEANALYTICS.UPLOADS}/${videoId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to delete uploaded video');
  }
}

// ── Processing ──

/** Submit a batch of uploaded videos for background processing */
export async function processBatchSessions(
  payload: ProcessSessionPayload,
): Promise<ApiResponse<AnalyticsSession[]>> {
  try {
    const response = await apiClient.post<ApiResponse<AnalyticsSession[]>>(
      API_ENDPOINTS.PEOPLEANALYTICS.PROCESS,
      payload,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to start processing');
  }
}

// ── Sessions ──

/** List all analytics sessions for the tenant */
export async function listAnalyticsSessions(): Promise<
  ApiResponse<AnalyticsSession[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<AnalyticsSession[]>>(
      API_ENDPOINTS.PEOPLEANALYTICS.SESSIONS,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch sessions');
  }
}

/** Get full details of a single analytics session */
export async function getAnalyticsSessionDetails(
  sessionId: string,
): Promise<ApiResponse<AnalyticsSession>> {
  try {
    const response = await apiClient.get<ApiResponse<AnalyticsSession>>(
      `${API_ENDPOINTS.PEOPLEANALYTICS.SESSIONS}/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch session details');
  }
}

/** Get detected people for a completed session */
export async function getSessionDetectedPeople(
  sessionId: string,
): Promise<ApiResponse<DetectedPerson[]>> {
  try {
    const response = await apiClient.get<ApiResponse<DetectedPerson[]>>(
      `${API_ENDPOINTS.PEOPLEANALYTICS.SESSIONS}/${sessionId}/people`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch detected people');
  }
}

/** Delete an analytics session and its files */
export async function deleteAnalyticsSession(
  sessionId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.PEOPLEANALYTICS.SESSIONS}/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to delete session');
  }
}

// ── Visitors ──

/** Get cross-video aggregated visitor analytics */
export async function getVisitorAnalytics(): Promise<
  ApiResponse<VisitorAnalytics>
> {
  try {
    const response = await apiClient.get<ApiResponse<VisitorAnalytics>>(
      API_ENDPOINTS.PEOPLEANALYTICS.VISITORS,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch visitor analytics');
  }
}

/** Get visitor attendance logs by date range */
export async function getVisitorAttendance(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<VisitorAttendanceResponse[]>> {
  try {
    const response = await apiClient.get<
      ApiResponse<VisitorAttendanceResponse[]>
    >(`${API_ENDPOINTS.PEOPLEANALYTICS.VISITORS}/attendance`, {
      params: {
        start_date: startDate,
        end_date: endDate,
      },
    });
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch visitor attendance');
  }
}

/** Register a visitor or convert them to an employee */
export async function registerVisitor(payload: {
  identity_id: string;
  registration_type: 'employee' | 'visitor';
  first_name: string;
  last_name: string;
  employee_code?: string;
}): Promise<ApiResponse<{ message: string; type: 'employee' | 'visitor' }>> {
  try {
    const response = await apiClient.post<
      ApiResponse<{ message: string; type: 'employee' | 'visitor' }>
    >(`${API_ENDPOINTS.PEOPLEANALYTICS.VISITORS}/register`, payload);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to register visitor');
  }
}

// ── Media URLs ──

/** Returns the streaming URL for an annotated output video */
export function getAnnotatedVideoUrl(sessionId: string): string {
  console.log(
    `VIDEO URL: ${BACKEND_URL}/api/v1/peopleanalytics/sessions/${sessionId}/video`,
  );
  return `${BACKEND_URL}/api/v1/peopleanalytics/sessions/${sessionId}/video`;
}

/** Returns the HTTP URL for a raw uploaded video file */
export function getRawVideoUrl(savedPath: string): string {
  const normalized = savedPath.replace(/\\/g, '/');
  return `${BACKEND_URL}/${normalized}`;
}

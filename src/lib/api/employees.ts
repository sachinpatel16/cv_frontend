import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  Employee,
  AttendanceLog,
  AttendanceVideoSession,
  AttendanceUploadedVideo,
  GroupPhotoResult,
} from '@/types/employees';

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

// ── Core Employee Profiles ──

/** Register a new employee with face photo */
export async function registerEmployee(
  formData: FormData,
): Promise<ApiResponse<Employee>> {
  try {
    const response = await apiClient.post<ApiResponse<Employee>>(
      API_ENDPOINTS.EMPLOYEES.BASE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to register employee');
  }
}

/** List all active employees */
export async function listEmployees(): Promise<ApiResponse<Employee[]>> {
  try {
    const response = await apiClient.get<ApiResponse<Employee[]>>(
      API_ENDPOINTS.EMPLOYEES.BASE,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch employees');
  }
}

/** Get a single employee by ID */
export async function getEmployee(
  employeeId: string,
): Promise<ApiResponse<Employee>> {
  try {
    const response = await apiClient.get<ApiResponse<Employee>>(
      `${API_ENDPOINTS.EMPLOYEES.BASE}/${employeeId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch employee');
  }
}

/** Update employee profile (optionally re-upload face photo) */
export async function updateEmployee(
  employeeId: string,
  formData: FormData,
): Promise<ApiResponse<Employee>> {
  try {
    const response = await apiClient.put<ApiResponse<Employee>>(
      `${API_ENDPOINTS.EMPLOYEES.BASE}/${employeeId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update employee');
  }
}

/** Soft-delete an employee */
export async function deleteEmployee(
  employeeId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.EMPLOYEES.BASE}/${employeeId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to delete employee');
  }
}

// ── Attendance Logging ──

/** Get attendance logs for all employees within a date range */
export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string,
): Promise<ApiResponse<AttendanceLog[]>> {
  try {
    const response = await apiClient.get<ApiResponse<AttendanceLog[]>>(
      `${API_ENDPOINTS.EMPLOYEES.ATTENDANCE}?start_date=${startDate}&end_date=${endDate}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch attendance logs');
  }
}

/** Get attendance logs for a specific analytics session */
export async function getSessionAttendance(
  sessionId: string,
): Promise<ApiResponse<AttendanceLog[]>> {
  try {
    const response = await apiClient.get<ApiResponse<AttendanceLog[]>>(
      `/employees/sessions/${sessionId}/attendance`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch session attendance');
  }
}

/** Mark attendance via a group photo */
export async function markGroupPhotoAttendance(
  formData: FormData,
): Promise<ApiResponse<GroupPhotoResult>> {
  try {
    const response = await apiClient.post<ApiResponse<GroupPhotoResult>>(
      API_ENDPOINTS.EMPLOYEES.ATTENDANCE_PHOTO,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to mark group photo attendance');
  }
}

// ── Standalone Attendance Video ──

/** Upload standalone attendance video files */
export async function uploadAttendanceVideos(
  files: File[],
): Promise<ApiResponse<AttendanceUploadedVideo[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    const response = await apiClient.post<
      ApiResponse<AttendanceUploadedVideo[]>
    >(API_ENDPOINTS.EMPLOYEES.ATTENDANCE_VIDEO_UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to upload attendance videos');
  }
}

/** List all uploaded attendance videos */
export async function listAttendanceUploads(): Promise<
  ApiResponse<AttendanceUploadedVideo[]>
> {
  try {
    const response = await apiClient.get<
      ApiResponse<AttendanceUploadedVideo[]>
    >(API_ENDPOINTS.EMPLOYEES.ATTENDANCE_VIDEO_UPLOADS);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to list attendance uploads');
  }
}

/** Delete a single uploaded attendance video */
export async function deleteAttendanceUpload(
  videoId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.EMPLOYEES.ATTENDANCE_VIDEO_UPLOADS}/${videoId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to delete attendance upload');
  }
}

/** Process uploaded attendance videos as background tasks */
export async function processAttendanceVideos(payload: {
  videos: { video_path: string }[];
}): Promise<ApiResponse<AttendanceVideoSession[]>> {
  try {
    const response = await apiClient.post<
      ApiResponse<AttendanceVideoSession[]>
    >(API_ENDPOINTS.EMPLOYEES.ATTENDANCE_VIDEO_PROCESS, payload);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to process attendance videos');
  }
}

/** List all attendance video sessions */
export async function listAttendanceSessions(): Promise<
  ApiResponse<AttendanceVideoSession[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<AttendanceVideoSession[]>>(
      API_ENDPOINTS.EMPLOYEES.ATTENDANCE_VIDEO_SESSIONS,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch attendance sessions');
  }
}

/** Get details of a single attendance video session */
export async function getAttendanceSessionDetails(
  sessionId: string,
): Promise<ApiResponse<AttendanceVideoSession>> {
  try {
    const response = await apiClient.get<ApiResponse<AttendanceVideoSession>>(
      `${API_ENDPOINTS.EMPLOYEES.ATTENDANCE_VIDEO_SESSIONS}/${sessionId}`,
    );
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch attendance session details');
  }
}

// ── Media URLs ──

/** Returns the streaming URL for an annotated attendance video */
export function getAttendanceVideoUrl(sessionId: string): string {
  return `${BACKEND_URL}/api/v1/employees/attendance/video/sessions/${sessionId}/video`;
}

/** Returns the display URL for an employee profile photo */
export function getEmployeePhotoUrl(photoPath: string): string {
  const normalized = photoPath.replace(/\\/g, '/');
  return `${BACKEND_URL}/${normalized}`;
}

/** Returns the display URL for an annotated group photo */
export function getAnnotatedGroupPhotoUrl(imagePath: string): string {
  const normalized = imagePath.replace(/\\/g, '/');
  return `${BACKEND_URL}/${normalized}`;
}

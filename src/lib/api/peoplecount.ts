import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  PeopleCountMedia,
  PeopleCountMediaDetails,
  TrackResult,
} from '@/types/peoplecount';

/** Upload & queue one or more photos/videos for people counting */
export async function uploadPeopleCountMedia(
  files: File[],
  mediaType: 'photo' | 'video',
  minTrackFrames?: number,
  trackBuffer?: number,
  confidenceThreshold?: number,
): Promise<ApiResponse<PeopleCountMedia[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('media_type', mediaType);
    if (minTrackFrames !== undefined) {
      formData.append('min_track_frames', String(minTrackFrames));
    }
    if (trackBuffer !== undefined) {
      formData.append('track_buffer', String(trackBuffer));
    }
    if (confidenceThreshold !== undefined) {
      formData.append('confidence_threshold', String(confidenceThreshold));
    }

    const response = await apiClient.post<ApiResponse<PeopleCountMedia[]>>(
      API_ENDPOINTS.PEOPLECOUNT.MEDIA,
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

/** List all people count media items for the active tenant */
export async function listPeopleCountMedia(): Promise<
  ApiResponse<PeopleCountMedia[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<PeopleCountMedia[]>>(
      API_ENDPOINTS.PEOPLECOUNT.MEDIA,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch media list',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get detailed metrics, status, and track results of a single media item */
export async function getPeopleCountMediaDetails(
  mediaId: string,
): Promise<ApiResponse<PeopleCountMediaDetails>> {
  try {
    const response = await apiClient.get<ApiResponse<PeopleCountMediaDetails>>(
      `${API_ENDPOINTS.PEOPLECOUNT.MEDIA}/${mediaId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch media details',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Get only individual person tracking results for a specific media source */
export async function getPersonTrackResults(
  mediaId: string,
): Promise<ApiResponse<TrackResult[]>> {
  try {
    const response = await apiClient.get<ApiResponse<TrackResult[]>>(
      `${API_ENDPOINTS.PEOPLECOUNT.MEDIA}/${mediaId}/results`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to fetch track results',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Soft-delete a media record and physically delete storage files */
export async function deletePeopleCountMedia(
  mediaId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.PEOPLECOUNT.MEDIA}/${mediaId}`,
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

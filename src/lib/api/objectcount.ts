import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type {
  ObjectCountMedia,
  ObjectCountMediaDetails,
  ObjectTrackResult,
} from '@/types/objectcount';

export interface ObjectAnalysisConfig {
  classes_to_track?: string[] | null;
  classify_gender?: boolean;
  classify_vehicle?: boolean;
  confidence_threshold?: number;
  min_track_frames?: number;
  track_buffer?: number;
  entry_exit_report?: boolean;
  line_coords?: number[][] | null;
  gmc_method?: string;
  reid_classes?: string[] | null;
  imgsz?: number;
}

/** Upload one or more photos or videos to be tracked. Media is initially saved in a "pending" state. */
export async function uploadObjectCountMedia(
  files: File[],
  mediaType: 'photo' | 'video',
): Promise<ApiResponse<ObjectCountMedia[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('media_type', mediaType);

    const response = await apiClient.post<ApiResponse<ObjectCountMedia[]>>(
      API_ENDPOINTS.OBJECTCOUNT.MEDIA,
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

/** Triggers a customized background YOLO + BoT-SORT + InsightFace analysis task */
export async function triggerObjectAnalysis(
  galleryMediaId: string,
  config: ObjectAnalysisConfig,
): Promise<ApiResponse<ObjectCountMedia>> {
  try {
    const response = await apiClient.post<ApiResponse<ObjectCountMedia>>(
      '/objectcount/analyze',
      {
        gallery_media_id: galleryMediaId,
        ...config,
      },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to trigger object analysis',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Retrieves all uploaded object count media items scoped to the active tenant */
export async function listObjectCountMedia(): Promise<
  ApiResponse<ObjectCountMedia[]>
> {
  try {
    const response = await apiClient.get<ApiResponse<ObjectCountMedia[]>>(
      API_ENDPOINTS.OBJECTCOUNT.MEDIA,
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

/** Retrieves detailed metrics, status, configuration options, and associated tracking results */
export async function getObjectCountMediaDetails(
  mediaId: string,
): Promise<ApiResponse<ObjectCountMediaDetails>> {
  try {
    const response = await apiClient.get<ApiResponse<ObjectCountMediaDetails>>(
      `${API_ENDPOINTS.OBJECTCOUNT.MEDIA}/${mediaId}`,
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

/** Retrieves only the list of individual object tracking results */
export async function getObjectTrackResults(
  mediaId: string,
): Promise<ApiResponse<ObjectTrackResult[]>> {
  try {
    const response = await apiClient.get<ApiResponse<ObjectTrackResult[]>>(
      `${API_ENDPOINTS.OBJECTCOUNT.MEDIA}/${mediaId}/results`,
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

/** Soft-deletes a media record and associated results from the database, and physically deletes storage files */
export async function deleteObjectCountMedia(
  mediaId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.OBJECTCOUNT.MEDIA}/${mediaId}`,
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

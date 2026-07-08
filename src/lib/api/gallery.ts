import { AxiosError } from 'axios';
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import { ApiError } from '@/types/api';
import type { ApiResponse } from '@/types/api';
import type { GalleryMedia } from '@/types/gallery';

/** Upload one or more photo/video files to the centralized gallery */
export async function uploadGalleryMedia(
  files: File[],
  mediaType: 'photo' | 'video',
): Promise<ApiResponse<GalleryMedia[]>> {
  try {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    formData.append('media_type', mediaType);

    const response = await apiClient.post<ApiResponse<GalleryMedia[]>>(
      API_ENDPOINTS.GALLERY.MEDIA,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Media upload to gallery failed',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** List all uploaded gallery media for the current tenant */
export async function listGalleryMedia(
  mediaType?: 'photo' | 'video',
): Promise<ApiResponse<GalleryMedia[]>> {
  try {
    const params = mediaType ? { media_type: mediaType } : {};
    const response = await apiClient.get<ApiResponse<GalleryMedia[]>>(
      API_ENDPOINTS.GALLERY.MEDIA,
      { params },
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to list gallery media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Delete a single gallery media item */
export async function deleteGalleryMedia(
  mediaId: string,
): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      `${API_ENDPOINTS.GALLERY.MEDIA}/${mediaId}`,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to delete gallery media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

/** Centralized utility to get streaming/raw URL for any gallery media file */
export function getGalleryMediaUrl(filepath: string): string {
  const base = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const normalized = filepath.replace(/\\/g, '/');
  return `${base}/${normalized}`;
}

/** Delete all gallery media items for the current tenant */
export async function deleteAllGalleryMedia(): Promise<ApiResponse<null>> {
  try {
    const response = await apiClient.delete<ApiResponse<null>>(
      API_ENDPOINTS.GALLERY.MEDIA,
    );
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to delete all gallery media',
        error.response?.status,
      );
    }
    throw new ApiError('An unexpected error occurred');
  }
}

import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  uploadPeopleCountMedia,
  listPeopleCountMedia,
  getPeopleCountMediaDetails,
  deletePeopleCountMedia,
} from '@/lib/api/peoplecount';
import { ApiError } from '@/types/api';
import type {
  PeopleCountMedia,
  PeopleCountMediaDetails,
} from '@/types/peoplecount';

type Tab = 'library' | 'details';

interface PeopleCountState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  media: PeopleCountMedia[];
  mediaLoading: boolean;
  uploading: boolean;
  mediaType: 'photo' | 'video';
  minTrackFrames: number;
  trackBuffer: number;
  confidenceThreshold: number;
  selectedMediaId: string | null;
  details: PeopleCountMediaDetails | null;
  detailsLoading: boolean;

  setMediaType: (t: 'photo' | 'video') => void;
  setMinTrackFrames: (v: number) => void;
  setTrackBuffer: (v: number) => void;
  setConfidenceThreshold: (v: number) => void;
  fetchMedia: (showLoading?: boolean) => Promise<void>;
  addMedia: (files: File[]) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  openDetails: (id: string) => Promise<void>;
  closeDetails: () => void;
}

export const usePeopleCountStore = create<PeopleCountState>((set, get) => ({
  activeTab: 'library',
  setActiveTab: (tab) => set({ activeTab: tab }),

  media: [],
  mediaLoading: true,
  uploading: false,
  mediaType: 'video',
  minTrackFrames: 300,
  trackBuffer: 150,
  confidenceThreshold: 0.35,
  selectedMediaId: null,
  details: null,
  detailsLoading: false,

  setMediaType: (t) => set({ mediaType: t }),
  setMinTrackFrames: (v) => set({ minTrackFrames: v }),
  setTrackBuffer: (v) => set({ trackBuffer: v }),
  setConfidenceThreshold: (v) => set({ confidenceThreshold: v }),

  fetchMedia: async (showLoading = true) => {
    if (showLoading) set({ mediaLoading: true });
    try {
      const res = await listPeopleCountMedia();
      set({ media: res.data });
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      set({ mediaLoading: false });
    }
  },

  addMedia: async (files) => {
    const { mediaType, minTrackFrames, trackBuffer, confidenceThreshold } =
      get();
    set({ uploading: true });
    try {
      const res = await uploadPeopleCountMedia(
        files,
        mediaType,
        mediaType === 'video' ? minTrackFrames : undefined,
        mediaType === 'video' ? trackBuffer : undefined,
        mediaType === 'video' ? confidenceThreshold : undefined,
      );
      toast.success(
        `Uploaded ${res.data.length} file(s). Processing in background.`,
      );
      set((s) => ({ media: [...res.data, ...s.media] }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      set({ uploading: false });
    }
  },

  removeMedia: async (id) => {
    try {
      await deletePeopleCountMedia(id);
      set((s) => ({ media: s.media.filter((m) => m.id !== id) }));
      if (get().selectedMediaId === id)
        set({ selectedMediaId: null, details: null, activeTab: 'library' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  },

  openDetails: async (id) => {
    set({ selectedMediaId: id, activeTab: 'details', detailsLoading: true });
    try {
      const res = await getPeopleCountMediaDetails(id);
      set({ details: res.data });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to load details',
      );
    } finally {
      set({ detailsLoading: false });
    }
  },

  closeDetails: () =>
    set({ activeTab: 'library', selectedMediaId: null, details: null }),
}));

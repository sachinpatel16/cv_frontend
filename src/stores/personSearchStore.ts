import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  uploadMedia,
  listMedia,
  deleteMedia,
  bulkDeleteMedia,
  searchBySelfie,
  searchVideo,
  getSessionMatches,
  getSessionHistory,
} from '@/lib/api/peoplefind';
import { ApiError } from '@/types/api';
import type {
  MediaSource,
  SearchSession,
  SearchMatch,
  SessionHistoryItem,
} from '@/types/peoplefind';

type Tab = 'library' | 'search' | 'results';

interface PersonSearchState {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Library
  media: MediaSource[];
  mediaLoading: boolean;
  uploading: boolean;
  selectedIds: string[];
  deleteAllOpen: boolean;
  fetchMedia: () => Promise<void>;
  addMedia: (files: File[]) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  bulkRemoveMedia: () => Promise<void>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setDeleteAllOpen: (v: boolean) => void;

  // Search
  selfieFile: File | null;
  selfiePreview: string | null;
  similarity: number;
  maxResults: number;
  searching: boolean;
  setSelfie: (file: File | null, preview: string | null) => void;
  setSimilarity: (v: number) => void;
  setMaxResults: (v: number) => void;
  runSearch: () => Promise<void>;

  // Results
  session: SearchSession | null;
  matches: SearchMatch[];
  history: SessionHistoryItem[];
  historyLoading: boolean;
  historyOpen: boolean;
  loadHistory: () => Promise<void>;
  selectHistorySession: (s: SessionHistoryItem) => Promise<void>;
  setHistoryOpen: (v: boolean) => void;
}

export const usePersonSearchStore = create<PersonSearchState>((set, get) => ({
  activeTab: 'library',
  setActiveTab: (tab) => set({ activeTab: tab }),

  media: [],
  mediaLoading: true,
  uploading: false,
  selectedIds: [],
  deleteAllOpen: false,

  fetchMedia: async () => {
    set({ mediaLoading: true });
    try {
      const res = await listMedia();
      set({ media: res.data });
    } catch {
      /* silent */
    } finally {
      set({ mediaLoading: false });
    }
  },

  addMedia: async (files) => {
    set({ uploading: true });
    // Determine media type from first file mime
    const mediaType: 'photo' | 'video' = files[0]?.type.startsWith('video')
      ? 'video'
      : 'photo';
    try {
      const res = await uploadMedia(files, mediaType);
      toast.success(`Uploaded ${res.data.length} file(s)`);
      set((s) => ({ media: [...res.data, ...s.media] }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Upload failed');
    } finally {
      set({ uploading: false });
    }
  },

  removeMedia: async (id) => {
    try {
      await deleteMedia(id);
      set((s) => ({
        media: s.media.filter((m) => m.id !== id),
        selectedIds: s.selectedIds.filter((x) => x !== id),
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Delete failed');
    }
  },

  bulkRemoveMedia: async () => {
    const { selectedIds } = get();
    try {
      await bulkDeleteMedia();
      toast.success(`Deleted ${selectedIds.length} item(s)`);
      set((s) => ({
        media: s.media.filter((m) => !s.selectedIds.includes(m.id)),
        selectedIds: [],
        deleteAllOpen: false,
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Bulk delete failed');
    }
  },

  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),
  clearSelection: () => set({ selectedIds: [] }),
  setDeleteAllOpen: (v) => set({ deleteAllOpen: v }),

  selfieFile: null,
  selfiePreview: null,
  similarity: 0.6,
  maxResults: 20,
  searching: false,

  setSelfie: (file, preview) =>
    set({ selfieFile: file, selfiePreview: preview }),
  setSimilarity: (v) => set({ similarity: v }),
  setMaxResults: (v) => set({ maxResults: v }),

  runSearch: async () => {
    const { selfieFile, media, similarity } = get();
    if (!selfieFile || media.length === 0) {
      toast.error('Upload a selfie and at least one media source');
      return;
    }
    set({ searching: true });
    try {
      const videoMedia = media.filter((m) => m.media_type === 'video');
      let session: SearchSession | null = null;
      let matches: SearchMatch[] = [];

      if (videoMedia.length > 0) {
        // Search the first video
        const res = await searchVideo(selfieFile, videoMedia[0].id, similarity);
        session = res.data;
        if (session?.id) {
          const mr = await getSessionMatches(session.id);
          matches = mr.data;
        }
      } else {
        const res = await searchBySelfie(selfieFile, similarity);
        session = res.data;
        if (session?.id) {
          const mr = await getSessionMatches(session.id);
          matches = mr.data;
        }
      }
      set({ session, matches, activeTab: 'results' });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Search failed');
    } finally {
      set({ searching: false });
    }
  },

  session: null,
  matches: [],
  history: [],
  historyLoading: false,
  historyOpen: false,

  loadHistory: async () => {
    set({ historyLoading: true });
    try {
      const res = await getSessionHistory();
      set({ history: res.data, historyOpen: true });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to load history',
      );
    } finally {
      set({ historyLoading: false });
    }
  },

  selectHistorySession: async (s) => {
    set({ historyOpen: false });
    try {
      const mr = await getSessionMatches(s.id);
      // Cast history item to session shape
      set({
        session: {
          id: s.id,
          selfie_path: s.selfie_path,
          threshold: s.threshold,
          status: s.status,
          created_at: s.created_at,
          results: mr.data,
        } as SearchSession,
        matches: mr.data,
        activeTab: 'results',
      });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to load matches',
      );
    }
  },

  setHistoryOpen: (v) => set({ historyOpen: v }),
}));

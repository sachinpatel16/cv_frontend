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
  fetchMedia: (silent?: boolean) => Promise<void>;
  addMedia: (files: File[]) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  bulkRemoveMedia: () => Promise<void>;
  bulkDeleteMedia: () => Promise<void>;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setDeleteAllOpen: (v: boolean) => void;

  // Search
  selfieFile: File | null;
  selfiePreview: string | null;
  similarity: number;
  maxResults: number;
  searching: boolean;
  selectedSearchMediaIds: string[];
  setSelfie: (file: File | null, preview: string | null) => void;
  setSimilarity: (v: number) => void;
  setMaxResults: (v: number) => void;
  setSelectedSearchMediaIds: (
    ids: string[] | ((prev: string[]) => string[]),
  ) => void;
  runSearch: (selectedMediaIds?: string[]) => Promise<void>;

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

  fetchMedia: async (silent = false) => {
    if (!silent) set({ mediaLoading: true });
    try {
      const res = await listMedia();
      const currentMedia = get().media;
      const hasChanged =
        currentMedia.length !== res.data.length ||
        res.data.some((newItem, index) => {
          const currentItem = currentMedia[index];
          return (
            !currentItem ||
            currentItem.id !== newItem.id ||
            currentItem.status !== newItem.status ||
            currentItem.filepath !== newItem.filepath
          );
        });

      if (hasChanged) {
        set({ media: res.data });
      }
    } catch {
      /* silent */
    } finally {
      if (!silent) set({ mediaLoading: false });
    }
  },

  addMedia: async (files) => {
    set({ uploading: true });
    try {
      const videos = files.filter((f) => f.type.startsWith('video'));
      const photos = files.filter((f) => !f.type.startsWith('video'));

      const promises: Promise<any>[] = [];
      if (videos.length > 0) {
        promises.push(uploadMedia(videos, 'video'));
      }
      if (photos.length > 0) {
        promises.push(uploadMedia(photos, 'photo'));
      }

      const results = await Promise.all(promises);
      const allUploaded = results.flatMap((res) => res.data);

      toast.success(`Uploaded ${allUploaded.length} file(s)`);
      set((s) => {
        const merged = [...s.media];
        allUploaded.forEach((item) => {
          if (!merged.some((e) => e.id === item.id)) {
            merged.unshift(item);
          }
        });
        return { media: merged };
      });
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
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteMedia(id)));
      toast.success(`Deleted ${selectedIds.length} item(s)`);
      set((s) => ({
        media: s.media.filter((m) => !selectedIds.includes(m.id)),
        selectedIds: [],
        deleteAllOpen: false,
      }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Bulk delete failed');
    }
  },

  bulkDeleteMedia: async () => {
    await bulkDeleteMedia();
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
  selectedSearchMediaIds: [],

  setSelfie: (file, preview) =>
    set({ selfieFile: file, selfiePreview: preview }),
  setSimilarity: (v) => set({ similarity: v }),
  setMaxResults: (v) => set({ maxResults: v }),
  setSelectedSearchMediaIds: (ids) =>
    set((s) => ({
      selectedSearchMediaIds:
        typeof ids === 'function' ? ids(s.selectedSearchMediaIds) : ids,
    })),

  runSearch: async (selectedMediaIds) => {
    const { selfieFile, media, similarity } = get();
    if (!selfieFile || media.length === 0) {
      toast.error('Upload a selfie and at least one media source');
      return;
    }
    set({ searching: true });
    try {
      const res = await searchBySelfie(selfieFile, similarity);
      const session = res.data;
      let matches: SearchMatch[] = [];
      if (session?.id) {
        const mr = await getSessionMatches(session.id);
        matches = mr.data;
      }

      // Filter matches by selected media IDs if any are specified
      if (selectedMediaIds && selectedMediaIds.length > 0) {
        matches = matches.filter((m) =>
          selectedMediaIds.includes(m.media_source.id),
        );
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
      set({ history: res.data });
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

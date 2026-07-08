import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  uploadGalleryMedia,
  listGalleryMedia,
  deleteGalleryMedia,
  deleteAllGalleryMedia,
} from '@/lib/api/gallery';
import type { GalleryMedia } from '@/types/gallery';

type FilterType = 'all' | 'video' | 'photo';
type LayoutType = 'grid' | 'list';

interface LibraryPageState {
  mediaList: GalleryMedia[];
  loading: boolean;
  uploading: boolean;
  activeFilter: FilterType;
  viewLayout: LayoutType;

  // Modal states
  previewItem: GalleryMedia | null;
  itemToDelete: GalleryMedia | null;
  deleteAllOpen: boolean;
  deleteConfirmText: string;

  // Setters
  setActiveFilter: (filter: FilterType) => void;
  setViewLayout: (layout: LayoutType) => void;
  setPreviewItem: (item: GalleryMedia | null) => void;
  setItemToDelete: (item: GalleryMedia | null) => void;
  setDeleteAllOpen: (open: boolean) => void;
  setDeleteConfirmText: (text: string) => void;

  // Actions
  fetchGallery: () => Promise<void>;
  handleUpload: (files: File[]) => Promise<void>;
  confirmDeleteSingle: () => Promise<void>;
  confirmDeleteAll: () => Promise<void>;
}

export const useLibraryPageStore = create<LibraryPageState>((set, get) => ({
  mediaList: [],
  loading: false,
  uploading: false,
  activeFilter: 'all',
  viewLayout: 'grid',

  previewItem: null,
  itemToDelete: null,
  deleteAllOpen: false,
  deleteConfirmText: '',

  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setViewLayout: (layout) => set({ viewLayout: layout }),
  setPreviewItem: (item) => set({ previewItem: item }),
  setItemToDelete: (item) => set({ itemToDelete: item }),
  setDeleteAllOpen: (open) => set({ deleteAllOpen: open }),
  setDeleteConfirmText: (text) => set({ deleteConfirmText: text }),

  fetchGallery: async () => {
    set({ loading: true });
    try {
      const res = await listGalleryMedia();
      set({ mediaList: res.data || [] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load media library');
    } finally {
      set({ loading: false });
    }
  },

  handleUpload: async (files) => {
    if (files.length === 0) return;
    set({ uploading: true });
    try {
      const photos = files.filter((f) => f.type.startsWith('image/'));
      const videos = files.filter((f) => f.type.startsWith('video/'));

      const uploadPromises = [];
      if (photos.length > 0) {
        uploadPromises.push(uploadGalleryMedia(photos, 'photo'));
      }
      if (videos.length > 0) {
        uploadPromises.push(uploadGalleryMedia(videos, 'video'));
      }

      await Promise.all(uploadPromises);
      toast.success(`Successfully uploaded ${files.length} file(s)`);
      get().fetchGallery();
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload files');
    } finally {
      set({ uploading: false });
    }
  },

  confirmDeleteSingle: async () => {
    const { itemToDelete } = get();
    if (!itemToDelete) return;
    try {
      await deleteGalleryMedia(itemToDelete.id);
      toast.success('Media file deleted successfully');
      set({ itemToDelete: null });
      if (get().previewItem?.id === itemToDelete.id) {
        set({ previewItem: null });
      }
      get().fetchGallery();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete file');
    }
  },

  confirmDeleteAll: async () => {
    try {
      await deleteAllGalleryMedia();
      toast.success('All media deleted successfully');
      set({ deleteAllOpen: false, deleteConfirmText: '' });
      get().fetchGallery();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete all media');
    }
  },
}));

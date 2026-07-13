import { create } from 'zustand';
import { listGalleryMedia } from '@/lib/api/gallery';
import type { GalleryMedia } from '@/types/gallery';
import toast from 'react-hot-toast';
import { useObjectCountingStore } from './objectCountingStore';
import { usePersonAnalysisStore } from './personAnalysisStore';
import type { ActivityDetectorId } from './activityDetectionStore';

export type Step =
  | 'history'
  | 'upload'
  | 'select'
  | 'configure'
  | 'run'
  | 'results';
export type ResultsTabName =
  | 'object-count'
  | 'person-analysis'
  | 'activity-detection';

export type { ActivityDetectorId };

interface AnalysisPageState {
  activeStep: Step;
  setActiveStep: (step: Step) => void;
  activeResultsTab: ResultsTabName;
  setActiveResultsTab: (tab: ResultsTabName) => void;

  // Media selection
  uploadedMedia: GalleryMedia | null;
  setUploadedMedia: (media: GalleryMedia | null) => void;
  galleryList: GalleryMedia[];
  loadingGallery: boolean;
  fetchGalleryList: () => Promise<void>;

  // Single-selection analysis
  selectedAnalyses: {
    objectCount: boolean;
    personAnalysis: boolean;
    activityDetection: boolean;
  };
  setSelectedAnalyses: (val: {
    objectCount: boolean;
    personAnalysis: boolean;
    activityDetection: boolean;
  }) => void;
  toggleAnalysis: (
    key: 'objectCount' | 'personAnalysis' | 'activityDetection',
  ) => void;

  // Activity sub-detector (single selection)
  selectedActivityDetector: ActivityDetectorId | null;
  setSelectedActivityDetector: (id: ActivityDetectorId | null) => void;

  // Clear states
  clearMedia: () => void;
}

export const useAnalysisPageStore = create<AnalysisPageState>((set, get) => ({
  activeStep: 'history',
  setActiveStep: (step) => set({ activeStep: step }),
  activeResultsTab: 'object-count',
  setActiveResultsTab: (tab) => set({ activeResultsTab: tab }),

  uploadedMedia: null,
  setUploadedMedia: (media) => set({ uploadedMedia: media }),
  galleryList: [],
  loadingGallery: false,
  fetchGalleryList: async () => {
    set({ loadingGallery: true });
    try {
      const res = await listGalleryMedia('video');
      set({ galleryList: res.data || [] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load videos from library');
    } finally {
      set({ loadingGallery: false });
    }
  },

  selectedAnalyses: {
    objectCount: false,
    personAnalysis: false,
    activityDetection: false,
  },
  setSelectedAnalyses: (val) => set({ selectedAnalyses: val }),
  // Radio-style: selecting a new analysis deselects the previous one
  toggleAnalysis: (key) =>
    set((state) => {
      const wasOn = state.selectedAnalyses[key];
      return {
        selectedAnalyses: {
          objectCount: false,
          personAnalysis: false,
          activityDetection: false,
          [key]: !wasOn,
        },
        // Reset sub-detector when deselecting activity
        ...(key === 'activityDetection' && !wasOn === false
          ? { selectedActivityDetector: null }
          : {}),
      };
    }),

  selectedActivityDetector: null,
  setSelectedActivityDetector: (id) => set({ selectedActivityDetector: id }),

  clearMedia: () => {
    set({
      uploadedMedia: null,
      activeStep: 'history',
      selectedAnalyses: {
        objectCount: false,
        personAnalysis: false,
        activityDetection: false,
      },
      selectedActivityDetector: null,
    });

    // Safely reset downstream module stores
    useObjectCountingStore.setState({
      selectedMediaId: null,
      details: null,
    });
    usePersonAnalysisStore.setState({
      selectedSession: null,
    });
  },
}));

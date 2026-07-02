import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  listObjectCountMedia,
  uploadObjectCountMedia,
  deleteObjectCountMedia,
  getObjectCountMediaDetails,
  triggerObjectAnalysis,
} from '@/lib/api/objectcount';
import { ApiError } from '@/types/api';
import type {
  ObjectCountMedia,
  ObjectCountMediaDetails,
} from '@/types/objectcount';

type Tab = 'library' | 'config' | 'results';

interface ObjectCountingState {
  // Tabs
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // Library State
  media: ObjectCountMedia[];
  mediaLoading: boolean;
  uploading: boolean;
  mediaType: 'photo' | 'video';
  setMediaType: (type: 'photo' | 'video') => void;

  // Analysis Config State
  trackPeople: boolean;
  setTrackPeople: (v: boolean) => void;
  classifyGender: boolean;
  setClassifyGender: (v: boolean) => void;
  trackVehicles: boolean;
  setTrackVehicles: (v: boolean) => void;
  classifyVehicle: boolean;
  setClassifyVehicle: (v: boolean) => void;
  trackCustom: boolean;
  setTrackCustom: (v: boolean) => void;
  selectedCustomClasses: string[];
  setSelectedCustomClasses: (
    classes: string[] | ((prev: string[]) => string[]),
  ) => void;
  customSearchQuery: string;
  setCustomSearchQuery: (q: string) => void;
  toggleCustomClass: (c: string) => void;

  // ML Settings
  confidenceThreshold: number;
  setConfidenceThreshold: (v: number) => void;
  minTrackFrames: number;
  setMinTrackFrames: (v: number) => void;
  trackBuffer: number;
  setTrackBuffer: (v: number) => void;
  gmcMethod: string;
  setGmcMethod: (v: string) => void;
  imgsz: number;
  setImgsz: (v: number) => void;
  reidClasses: string[];
  setReidClasses: (classes: string[] | ((prev: string[]) => string[])) => void;
  toggleReidClass: (c: string) => void;

  // Analytics settings
  entryExitReport: boolean;
  setEntryExitReport: (v: boolean) => void;
  lineCoords: number[][] | null;
  setLineCoords: (coords: number[][] | null) => void;
  isDrawingModalOpen: boolean;
  setIsDrawingModalOpen: (v: boolean) => void;
  videoResolution: { width: number; height: number };
  setVideoResolution: (res: { width: number; height: number }) => void;

  // Details & Results
  selectedMediaId: string | null;
  setSelectedMediaId: (id: string | null) => void;
  details: ObjectCountMediaDetails | null;
  setDetails: (d: ObjectCountMediaDetails | null) => void;
  detailsLoading: boolean;
  triggeringAnalysisId: string | null;

  // Computed Methods
  getActiveClassesToTrack: () => string[];

  // Actions
  fetchMedia: (showLoading?: boolean) => Promise<void>;
  uploadMedia: (files: File[]) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  fetchDetails: (id: string) => Promise<void>;
  triggerAnalysis: () => Promise<void>;
}

export const useObjectCountingStore = create<ObjectCountingState>(
  (set, get) => ({
    activeTab: 'library',
    setActiveTab: (tab) => set({ activeTab: tab }),

    media: [],
    mediaLoading: true,
    uploading: false,
    mediaType: 'video',
    setMediaType: (type) => set({ mediaType: type }),

    trackPeople: true,
    setTrackPeople: (v) => set({ trackPeople: v }),
    classifyGender: false,
    setClassifyGender: (v) => set({ classifyGender: v }),
    trackVehicles: true,
    setTrackVehicles: (v) => set({ trackVehicles: v }),
    classifyVehicle: true,
    setClassifyVehicle: (v) => set({ classifyVehicle: v }),
    trackCustom: false,
    setTrackCustom: (v) => set({ trackCustom: v }),
    selectedCustomClasses: [],
    setSelectedCustomClasses: (classes) =>
      set((state) => ({
        selectedCustomClasses:
          typeof classes === 'function'
            ? classes(state.selectedCustomClasses)
            : classes,
      })),
    customSearchQuery: '',
    setCustomSearchQuery: (q) => set({ customSearchQuery: q }),
    toggleCustomClass: (c) =>
      set((state) => ({
        selectedCustomClasses: state.selectedCustomClasses.includes(c)
          ? state.selectedCustomClasses.filter((item) => item !== c)
          : [...state.selectedCustomClasses, c],
      })),

    confidenceThreshold: 0.35,
    setConfidenceThreshold: (v) => set({ confidenceThreshold: v }),
    minTrackFrames: 10,
    setMinTrackFrames: (v) => set({ minTrackFrames: v }),
    trackBuffer: 30,
    setTrackBuffer: (v) => set({ trackBuffer: v }),
    gmcMethod: 'none',
    setGmcMethod: (v) => set({ gmcMethod: v }),
    imgsz: 480,
    setImgsz: (v) => set({ imgsz: v }),
    reidClasses: ['person'],
    setReidClasses: (classes) =>
      set((state) => ({
        reidClasses:
          typeof classes === 'function' ? classes(state.reidClasses) : classes,
      })),
    toggleReidClass: (c) =>
      set((state) => ({
        reidClasses: state.reidClasses.includes(c)
          ? state.reidClasses.filter((x) => x !== c)
          : [...state.reidClasses, c],
      })),

    entryExitReport: false,
    setEntryExitReport: (v) => set({ entryExitReport: v }),
    lineCoords: null,
    setLineCoords: (coords) => set({ lineCoords: coords }),
    isDrawingModalOpen: false,
    setIsDrawingModalOpen: (v) => set({ isDrawingModalOpen: v }),
    videoResolution: { width: 1280, height: 720 },
    setVideoResolution: (res) => set({ videoResolution: res }),

    selectedMediaId: null,
    setSelectedMediaId: (id) => set({ selectedMediaId: id }),
    details: null,
    setDetails: (d) => set({ details: d }),
    detailsLoading: false,
    triggeringAnalysisId: null,

    getActiveClassesToTrack: () => {
      const { trackCustom, selectedCustomClasses, trackPeople, trackVehicles } =
        get();
      let classes: string[] = [];
      if (trackCustom) {
        classes = [...selectedCustomClasses];
        if (trackPeople && !classes.includes('person')) classes.push('person');
        if (trackVehicles) {
          ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].forEach((vc) => {
            if (!classes.includes(vc)) classes.push(vc);
          });
        }
      } else {
        if (trackPeople) classes.push('person');
        if (trackVehicles)
          classes.push('car', 'truck', 'bus', 'motorcycle', 'bicycle');
      }
      return classes;
    },

    fetchMedia: async (showLoading = true) => {
      if (showLoading) set({ mediaLoading: true });
      try {
        const res = await listObjectCountMedia();
        set({ media: res.data });
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
      } finally {
        set({ mediaLoading: false });
      }
    },

    uploadMedia: async (files: File[]) => {
      if (files.length === 0) return;
      const { mediaType, fetchMedia } = get();
      set({ uploading: true });
      try {
        const res = await uploadObjectCountMedia(files, mediaType);
        toast.success(
          `Uploaded ${res.data.length} file(s). Select a file to configure analysis.`,
        );
        await fetchMedia(false);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      } finally {
        set({ uploading: false });
      }
    },

    removeMedia: async (id: string) => {
      try {
        await deleteObjectCountMedia(id);
        toast.success('Media record deleted');
        set((s) => ({ media: s.media.filter((m) => m.id !== id) }));

        const { selectedMediaId } = get();
        if (selectedMediaId === id) {
          set({ selectedMediaId: null, details: null, activeTab: 'library' });
        }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Delete failed');
      }
    },

    fetchDetails: async (id: string) => {
      set({ detailsLoading: true });
      try {
        const res = await getObjectCountMediaDetails(id);

        // Auto-sync configuration fields with retrieved details
        const details = res.data;
        const updates: Partial<ObjectCountingState> = { details };

        updates.trackPeople = details.classes_to_track
          ? details.classes_to_track.includes('person')
          : true;
        updates.classifyGender = details.classify_gender ?? false;

        const vClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        updates.trackVehicles = details.classes_to_track
          ? details.classes_to_track.some((c) => vClasses.includes(c))
          : true;
        updates.classifyVehicle = details.classify_vehicle ?? true;

        const hasCustom =
          !!details.classes_to_track &&
          details.classes_to_track.some(
            (c) => c !== 'person' && !vClasses.includes(c),
          );
        updates.trackCustom = hasCustom;

        updates.selectedCustomClasses = details.classes_to_track
          ? details.classes_to_track.filter(
              (c) => c !== 'person' && !vClasses.includes(c),
            )
          : [];

        updates.entryExitReport = !!details.entry_exit_report;
        updates.lineCoords = details.line_coords || null;

        set(updates);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        set({ activeTab: 'library' });
      } finally {
        set({ detailsLoading: false });
      }
    },

    triggerAnalysis: async () => {
      const {
        selectedMediaId,
        trackCustom,
        selectedCustomClasses,
        trackPeople,
        trackVehicles,
        classifyGender,
        classifyVehicle,
        confidenceThreshold,
        minTrackFrames,
        trackBuffer,
        entryExitReport,
        lineCoords,
        gmcMethod,
        reidClasses,
        imgsz,
      } = get();

      if (!selectedMediaId) return;

      set({ triggeringAnalysisId: selectedMediaId });

      let classesToTrack: string[] | null = [];
      if (trackCustom) {
        if (selectedCustomClasses.length === 0) {
          classesToTrack = null;
        } else {
          classesToTrack = [...selectedCustomClasses];
          if (trackPeople && !classesToTrack.includes('person'))
            classesToTrack.push('person');
          if (trackVehicles) {
            ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].forEach((vc) => {
              if (!classesToTrack?.includes(vc)) classesToTrack?.push(vc);
            });
          }
        }
      } else {
        if (trackPeople) classesToTrack.push('person');
        if (trackVehicles)
          classesToTrack.push('car', 'truck', 'bus', 'motorcycle', 'bicycle');
        if (classesToTrack.length === 0) classesToTrack = null;
      }

      const config = {
        classes_to_track: classesToTrack,
        classify_gender: trackPeople ? classifyGender : false,
        classify_vehicle: trackVehicles ? classifyVehicle : false,
        confidence_threshold: confidenceThreshold,
        min_track_frames: minTrackFrames,
        track_buffer: trackBuffer,
        entry_exit_report: entryExitReport,
        line_coords: entryExitReport ? lineCoords : null,
        gmc_method: gmcMethod,
        reid_classes: reidClasses.length > 0 ? reidClasses : null,
        imgsz: imgsz,
      };

      try {
        const res = await triggerObjectAnalysis(selectedMediaId, config);
        toast.success('Object tracking analysis triggered successfully!');
        set((s) => ({
          media: s.media.map((item) =>
            item.id === selectedMediaId ? res.data : item,
          ),
          details:
            s.details && s.selectedMediaId === selectedMediaId
              ? { ...s.details, ...res.data }
              : s.details,
          activeTab: 'results',
        }));
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Failed to trigger analysis',
        );
      } finally {
        set({ triggeringAnalysisId: null });
      }
    },
  }),
);

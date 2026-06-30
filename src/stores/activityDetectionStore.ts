import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  uploadActivityMedia,
  processActivityMedia,
  getActivityProcessStatus,
  getActivityProcessHistory,
  listActivityMedia,
  deleteActivityMedia,
} from '@/lib/api/activity';
import { ApiError } from '@/types/api';
import type {
  ActivityMedia,
  ActivityProcessStatus,
  ActivityAlert,
  ActivityProcessPayload,
} from '@/types/activity';

// ─────────────────────────────────────────────────────────────────────────────
// Detector IDs & defaults
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityDetectorId =
  | 'fall'
  | 'fighting'
  | 'trespassing'
  | 'loitering'
  | 'occupancy'
  | 'sleeping'
  | 'walking'
  | 'mobile_phone'
  | 'sitting'
  | 'theft';

export type ActivityTab =
  | 'media'
  | 'configure'
  | 'processing'
  | 'results'
  | 'history';

interface DetectFlags {
  fall: boolean;
  aggression: boolean;
  intrusion: boolean;
  loitering: boolean;
  occupancy: boolean;
  sleeping: boolean;
  walking: boolean;
}

const ALL_OFF: DetectFlags = {
  fall: false,
  aggression: false,
  intrusion: false,
  loitering: false,
  occupancy: false,
  sleeping: false,
  walking: false,
};

/** Per-detector default flag configuration */
const DETECTOR_DEFAULTS: Record<
  ActivityDetectorId,
  Partial<DetectFlags> & { selectedActivities?: string[] }
> = {
  fall: { fall: true },
  fighting: { aggression: true },
  trespassing: { intrusion: true },
  loitering: { loitering: true },
  occupancy: { occupancy: true },
  sleeping: { sleeping: true },
  walking: { walking: true },
  mobile_phone: {
    selectedActivities: ['text on/look at a cellphone', 'answer phone'],
  },
  sitting: { selectedActivities: ['sit'] },
  theft: {},
};

// ─────────────────────────────────────────────────────────────────────────────
// Store Interface
// ─────────────────────────────────────────────────────────────────────────────

interface ActivityDetectionState {
  // ── Detector & Tab ──────────────────────────────────────────────────────────
  selectedDetector: ActivityDetectorId;
  activeTab: ActivityTab;
  setSelectedDetector: (id: ActivityDetectorId) => void;
  setActiveTab: (tab: ActivityTab) => void;

  // ── Media Upload ────────────────────────────────────────────────────────────
  uploadedFile: File | null;
  mediaType: 'photo' | 'video';
  uploadedMedia: ActivityMedia | null;
  uploading: boolean;
  setFile: (file: File | null, type: 'photo' | 'video') => void;
  uploadMedia: () => Promise<void>;

  // ── Configure ───────────────────────────────────────────────────────────────
  polygonPoints: [number, number][] | null;
  setPolygonPoints: (pts: [number, number][] | null) => void;
  interval: number;
  setInterval: (v: number) => void;
  detectFlags: DetectFlags;
  setFlag: (key: keyof DetectFlags, value: boolean) => void;
  loiteringThreshold: number;
  setLoiteringThreshold: (v: number) => void;
  occupancyLimit: number;
  setOccupancyLimit: (v: number) => void;
  selectedActivities: string[] | null;
  setSelectedActivities: (v: string[] | null) => void;
  applyDetectorDefaults: (id: ActivityDetectorId) => void;

  // ── Processing ──────────────────────────────────────────────────────────────
  processStatus: ActivityProcessStatus | null;
  alerts: ActivityAlert[];
  submitting: boolean;
  startProcessing: () => Promise<void>;
  pollStatus: () => Promise<void>;

  // ── History ─────────────────────────────────────────────────────────────────
  historyMedia: ActivityMedia[];
  historyLoading: boolean;
  fetchHistory: () => Promise<void>;
  loadHistoryItem: (media: ActivityMedia) => Promise<void>;
  removeMedia: (mediaId: string) => Promise<void>;

  // ── Reset ────────────────────────────────────────────────────────────────────
  reset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store Implementation
// ─────────────────────────────────────────────────────────────────────────────

export const useActivityDetectionStore = create<ActivityDetectionState>(
  (set, get) => ({
    // ── Detector & Tab ─────────────────────────────────────────────────────────
    selectedDetector: 'fall',
    activeTab: 'media',

    setSelectedDetector: (id) => {
      get().applyDetectorDefaults(id);
      set({
        selectedDetector: id,
        activeTab: 'media',
        uploadedFile: null,
        uploadedMedia: null,
        polygonPoints: null,
        processStatus: null,
        alerts: [],
      });
    },

    setActiveTab: (tab) => set({ activeTab: tab }),

    // ── Media Upload ───────────────────────────────────────────────────────────
    uploadedFile: null,
    mediaType: 'video',
    uploadedMedia: null,
    uploading: false,

    setFile: (file, type) =>
      set({ uploadedFile: file, mediaType: type, uploadedMedia: null }),

    uploadMedia: async () => {
      const { uploadedFile, mediaType } = get();
      if (!uploadedFile) return;
      set({ uploading: true });
      try {
        const res = await uploadActivityMedia([uploadedFile], mediaType);
        const media = res.data[0];
        set({ uploadedMedia: media, activeTab: 'configure' });
        toast.success('Media uploaded — now configure detection settings');
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Upload failed. Please try again.');
      } finally {
        set({ uploading: false });
      }
    },

    // ── Configure ──────────────────────────────────────────────────────────────
    polygonPoints: null,
    setPolygonPoints: (pts) => set({ polygonPoints: pts }),

    interval: 1.0,
    setInterval: (v) => set({ interval: v }),

    detectFlags: { ...ALL_OFF, fall: true },
    setFlag: (key, value) =>
      set((s) => ({ detectFlags: { ...s.detectFlags, [key]: value } })),

    loiteringThreshold: 15.0,
    setLoiteringThreshold: (v) => set({ loiteringThreshold: v }),

    occupancyLimit: 5,
    setOccupancyLimit: (v) => set({ occupancyLimit: v }),

    selectedActivities: null,
    setSelectedActivities: (v) => set({ selectedActivities: v }),

    applyDetectorDefaults: (id) => {
      const defaults = DETECTOR_DEFAULTS[id];
      const { selectedActivities: sa, ...flagDefaults } = defaults;
      set({
        detectFlags: { ...ALL_OFF, ...flagDefaults } as DetectFlags,
        selectedActivities: sa ?? null,
        polygonPoints: null,
      });
    },

    // ── Processing ─────────────────────────────────────────────────────────────
    processStatus: null,
    alerts: [],
    submitting: false,

    startProcessing: async () => {
      const {
        uploadedMedia,
        detectFlags,
        polygonPoints,
        interval,
        loiteringThreshold,
        occupancyLimit,
        selectedActivities,
      } = get();
      if (!uploadedMedia) return;
      set({ submitting: true });

      const payload: ActivityProcessPayload = {
        interval,
        detect_fall: detectFlags.fall,
        detect_aggression: detectFlags.aggression,
        detect_intrusion: detectFlags.intrusion,
        detect_loitering: detectFlags.loitering,
        loitering_threshold: loiteringThreshold,
        detect_occupancy: detectFlags.occupancy,
        occupancy_limit: occupancyLimit,
        detect_sleeping: detectFlags.sleeping,
        detect_walking: detectFlags.walking,
        selected_activities: selectedActivities,
        polygon_points: polygonPoints,
      };

      try {
        await processActivityMedia(uploadedMedia.id, payload);
        const statusRes = await getActivityProcessStatus(uploadedMedia.id);
        set({ processStatus: statusRes.data, activeTab: 'processing' });
        toast.success('Detection started — auto-checking every 10s…');
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Failed to start processing.');
      } finally {
        set({ submitting: false });
      }
    },

    pollStatus: async () => {
      const { uploadedMedia, processStatus } = get();
      const mediaId = uploadedMedia?.id ?? processStatus?.media_id;
      if (!mediaId) return;
      try {
        const res = await getActivityProcessStatus(String(mediaId));
        set({ processStatus: res.data });

        if (res.data.status === 'completed') {
          const alertRes = await getActivityProcessHistory(String(mediaId));
          set({ alerts: alertRes.data, activeTab: 'results' });
          const count = alertRes.data.length;
          toast.success(
            count > 0
              ? `✅ Detection complete — ${count} alert${count !== 1 ? 's' : ''} found`
              : '✅ Detection complete — no alerts detected',
            { duration: 5000 },
          );
        } else if (res.data.status === 'failed') {
          toast.error('Detection failed. Please re-process and try again.');
        }
      } catch {
        // silently continue polling — transient network error
      }
    },

    // ── History ────────────────────────────────────────────────────────────────
    historyMedia: [],
    historyLoading: false,

    fetchHistory: async () => {
      set({ historyLoading: true });
      try {
        const res = await listActivityMedia();
        set({ historyMedia: res.data });
      } catch {
        // silently fail
      } finally {
        set({ historyLoading: false });
      }
    },

    loadHistoryItem: async (media) => {
      try {
        const statusRes = await getActivityProcessStatus(media.id);
        let alerts: ActivityAlert[] = [];
        if (statusRes.data.status === 'completed') {
          const alertRes = await getActivityProcessHistory(media.id);
          alerts = alertRes.data;
        }
        set({
          uploadedMedia: media,
          processStatus: statusRes.data,
          alerts,
          activeTab: 'results',
        });
        toast.success(`Loaded: ${media.filename}`);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Failed to load history item.');
      }
    },

    removeMedia: async (mediaId) => {
      try {
        await deleteActivityMedia(mediaId);
        set((s) => ({
          historyMedia: s.historyMedia.filter((m) => m.id !== mediaId),
        }));
        toast.success('Media deleted');
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Failed to delete media.');
      }
    },

    // ── Reset ──────────────────────────────────────────────────────────────────
    reset: () =>
      set({
        activeTab: 'media',
        uploadedFile: null,
        uploadedMedia: null,
        polygonPoints: null,
        processStatus: null,
        alerts: [],
        detectFlags: { ...ALL_OFF, fall: true },
        selectedActivities: null,
        interval: 1.0,
        loiteringThreshold: 15.0,
        occupancyLimit: 5,
      }),
  }),
);

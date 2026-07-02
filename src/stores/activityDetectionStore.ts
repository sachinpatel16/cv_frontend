import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  uploadActivityMedia,
  processActivityMedia,
  getActivityProcessStatus,
  getActivityAlertsReport,
  getActivityAlertsSummary,
  listActivityMedia,
  deleteActivityMedia,
} from '@/lib/api/activity';
import {
  uploadVideoForAnalysis,
  getSmokingSessionStatus,
  getSmokingSessionHistory,
  deleteSmokingSession,
} from '@/lib/api/smokingdetect';
import { ApiError } from '@/types/api';
import type {
  ActivityMedia,
  ActivityProcessStatus,
  ActivityAlert,
  ActivityAlertSummary,
  ActivityProcessPayload,
  UnifiedHistoryItem,
} from '@/types/activity';
import type { SmokingSession, SmokingEvent } from '@/types/smokingdetect';

// ─────────────────────────────────────────────────────────────────────────────
// Detector IDs & defaults
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityDetectorId =
  | 'smoking'
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

/** Which backend API a current job belongs to */
export type JobFlavor = 'smoking' | 'activity';

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
  smoking: {},
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

  // ── Job Flavor ──────────────────────────────────────────────────────────────
  jobFlavor: JobFlavor;

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

  // ── Processing — Activity ───────────────────────────────────────────────────
  processStatus: ActivityProcessStatus | null;
  alerts: ActivityAlert[];
  summary: ActivityAlertSummary | null;
  setSummary: (s: ActivityAlertSummary | null) => void;
  submitting: boolean;
  startProcessing: () => Promise<void>;
  pollStatus: () => Promise<void>;

  // ── Processing — Smoking ────────────────────────────────────────────────────
  smokingSession: SmokingSession | null;
  smokingEvents: SmokingEvent[];
  smokingFilename: string | null;

  // ── Viewed/Loaded Results ──────────────────────────────────────────────────
  viewedMedia: ActivityMedia | null;
  viewedStatus: ActivityProcessStatus | null;
  viewedAlerts: ActivityAlert[];
  viewedSummary: ActivityAlertSummary | null;
  viewedSmokingSession: SmokingSession | null;
  viewedSmokingEvents: SmokingEvent[];

  // ── History ─────────────────────────────────────────────────────────────────
  unifiedHistory: UnifiedHistoryItem[];
  historyLoading: boolean;
  fetchHistory: () => Promise<void>;
  loadHistoryItem: (item: UnifiedHistoryItem) => Promise<void>;
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
    jobFlavor: 'activity',

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
        summary: null,
        smokingSession: null,
        smokingEvents: [],
        smokingFilename: null,
        jobFlavor: id === 'smoking' ? 'smoking' : 'activity',

        // Reset viewed states
        viewedMedia: null,
        viewedStatus: null,
        viewedAlerts: [],
        viewedSummary: null,
        viewedSmokingSession: null,
        viewedSmokingEvents: [],
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
      const { uploadedFile, mediaType, selectedDetector } = get();
      if (!uploadedFile) return;
      set({ uploading: true });

      // ── SMOKING: upload + trigger in one call ────────────────────────────────
      if (selectedDetector === 'smoking') {
        try {
          const res = await uploadVideoForAnalysis(
            uploadedFile,
            get().interval,
          );
          set({
            smokingSession: res.data,
            smokingEvents: [],
            smokingFilename: uploadedFile.name,
            jobFlavor: 'smoking',
            // Skip Configure — go straight to Processing
            activeTab: 'processing',

            // Set viewed state so Results tab displays it when ready
            viewedSmokingSession: res.data,
            viewedSmokingEvents: [],
          });
          toast.success('Smoking analysis started — auto-checking every 10s…');
        } catch (err) {
          if (err instanceof ApiError) toast.error(err.message);
          else toast.error('Upload failed. Please try again.');
        } finally {
          set({ uploading: false });
        }
        return;
      }

      // ── ACTIVITY: upload only, then go to Configure ──────────────────────────
      try {
        const res = await uploadActivityMedia([uploadedFile], mediaType);
        const media = res.data[0];
        set({
          uploadedMedia: media,
          jobFlavor: 'activity',
          activeTab: 'configure',
        });
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

    interval: 0.5,
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

    // ── Processing — Activity ──────────────────────────────────────────────────
    processStatus: null,
    alerts: [],
    summary: null,
    setSummary: (s) => set({ summary: s }),
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
        set({
          processStatus: statusRes.data,
          activeTab: 'processing',

          // Also configure viewed states for ResultsTab
          viewedMedia: uploadedMedia,
          viewedStatus: statusRes.data,
          viewedAlerts: [],
          viewedSummary: null,
        });
        toast.success('Detection started — auto-checking every 10s…');
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Failed to start processing.');
      } finally {
        set({ submitting: false });
      }
    },

    pollStatus: async () => {
      const { jobFlavor, uploadedMedia, processStatus, smokingSession } = get();

      // ── SMOKING polling ──────────────────────────────────────────────────────
      if (jobFlavor === 'smoking') {
        const sessionId = smokingSession?.id;
        if (!sessionId) return;
        try {
          const res = await getSmokingSessionStatus(sessionId);
          set({ smokingSession: res.data, smokingEvents: res.data.events });

          // If the viewed session is this active polling session, update its results in real-time
          if (get().viewedSmokingSession?.id === sessionId) {
            set({
              viewedSmokingSession: res.data,
              viewedSmokingEvents: res.data.events,
            });
          }

          if (res.data.status === 'completed') {
            set({
              viewedSmokingSession: res.data,
              viewedSmokingEvents: res.data.events,
              activeTab: 'results',
            });
            const count = res.data.events.filter(
              (e) => e.status === 'smoking_confirmed',
            ).length;
            toast.success(
              count > 0
                ? `🚬 Detection complete — ${count} confirmed smoking moment${count !== 1 ? 's' : ''}`
                : '✅ Detection complete — no smoking detected',
              { duration: 5000 },
            );
          } else if (res.data.status === 'failed') {
            toast.error('Detection failed. Please re-process and try again.');
          }
        } catch {
          // silently continue polling
        }
        return;
      }

      // ── ACTIVITY polling ─────────────────────────────────────────────────────
      const mediaId = uploadedMedia?.id ?? processStatus?.media_id;
      if (!mediaId) return;
      try {
        const res = await getActivityProcessStatus(String(mediaId));
        set({ processStatus: res.data });

        // If currently viewing this media in results, update its status
        if (get().viewedMedia?.id === String(mediaId)) {
          set({ viewedStatus: res.data });
        }

        if (res.data.status === 'completed') {
          const [alertRes, summaryRes] = await Promise.allSettled([
            getActivityAlertsReport({ mediaId: String(mediaId) }),
            getActivityAlertsSummary(String(mediaId)),
          ]);

          const alertData =
            alertRes.status === 'fulfilled' ? alertRes.value.data : [];
          const summaryData =
            summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;

          // Save active results
          set({ alerts: alertData, summary: summaryData });

          // If currently viewing this media OR if this is the active media that just finished,
          // load these results into the viewed state and navigate.
          set({
            viewedMedia: uploadedMedia,
            viewedStatus: res.data,
            viewedAlerts: alertData,
            viewedSummary: summaryData,
            activeTab: 'results',
          });

          const count = alertData.length;
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

    // ── Processing — Smoking ───────────────────────────────────────────────────
    smokingSession: null,
    smokingEvents: [],
    smokingFilename: null,

    // ── Viewed/Loaded Results ──────────────────────────────────────────────────
    viewedMedia: null,
    viewedStatus: null,
    viewedAlerts: [],
    viewedSummary: null,
    viewedSmokingSession: null,
    viewedSmokingEvents: [],

    // ── History ────────────────────────────────────────────────────────────────
    unifiedHistory: [],
    historyLoading: false,

    fetchHistory: async () => {
      set({ historyLoading: true });
      try {
        const [smokingRes, activityRes] = await Promise.allSettled([
          getSmokingSessionHistory(),
          listActivityMedia(),
        ]);

        const smokingRows: UnifiedHistoryItem[] =
          smokingRes.status === 'fulfilled'
            ? smokingRes.value.data.map((s) => ({
                id: s.id,
                flavor: 'smoking' as const,
                displayName: `Smoking Session`,
                status: s.status,
                created_at: s.created_at,
                overall_status: s.overall_status,
                total_events: s.total_events,
                smoking_interval: s.interval,
              }))
            : [];

        const activityRows: UnifiedHistoryItem[] =
          activityRes.status === 'fulfilled'
            ? activityRes.value.data.map((m) => ({
                id: m.id,
                flavor: 'activity' as const,
                displayName: m.filename,
                status: m.status,
                created_at: m.created_at,
                media_type: m.media_type,
                config: m.config,
              }))
            : [];

        const merged = [...smokingRows, ...activityRows].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        set({ unifiedHistory: merged });
      } catch {
        // silently fail
      } finally {
        set({ historyLoading: false });
      }
    },

    loadHistoryItem: async (item) => {
      // Navigate optimistically
      set({ activeTab: 'results', jobFlavor: item.flavor });

      // ── SMOKING history load ─────────────────────────────────────────────────
      if (item.flavor === 'smoking') {
        try {
          const res = await getSmokingSessionStatus(item.id);
          // Set viewed state ONLY — do NOT overwrite active background processing states
          set({
            viewedSmokingSession: res.data,
            viewedSmokingEvents: res.data.events,
            smokingFilename: item.displayName,
          });
          toast.success(`Loaded: ${item.displayName}`);
        } catch (err) {
          if (err instanceof ApiError) toast.error(err.message);
          else toast.error('Failed to load smoking session.');
        }
        return;
      }

      // ── ACTIVITY history load ────────────────────────────────────────────────
      try {
        const statusRes = await getActivityProcessStatus(item.id);

        const mediaRecord: ActivityMedia = {
          id: item.id,
          filename: item.displayName,
          filepath: '',
          media_type: item.media_type ?? 'video',
          status: item.status,
          created_at: item.created_at,
        };

        // Set viewed state ONLY — do NOT overwrite active background processing states
        set({
          viewedMedia: mediaRecord,
          viewedStatus: statusRes.data,
          viewedAlerts: [],
          viewedSummary: null,
        });

        if (statusRes.data.status === 'completed') {
          const [alertRes, summaryRes] = await Promise.allSettled([
            getActivityAlertsReport({ mediaId: item.id }),
            getActivityAlertsSummary(item.id),
          ]);
          const alertData =
            alertRes.status === 'fulfilled' ? alertRes.value.data : [];
          const summaryData =
            summaryRes.status === 'fulfilled' ? summaryRes.value.data : null;
          set({ viewedAlerts: alertData, viewedSummary: summaryData });
        }

        toast.success(`Loaded: ${item.displayName}`);
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Failed to load history item.');
      }
    },

    removeMedia: async (mediaId) => {
      try {
        const item = get().unifiedHistory.find((m) => m.id === mediaId);
        if (item?.flavor === 'smoking') {
          await deleteSmokingSession(mediaId);
          toast.success('Smoking session deleted');
        } else {
          await deleteActivityMedia(mediaId);
          toast.success('Media deleted');
        }
        set((s) => ({
          unifiedHistory: s.unifiedHistory.filter((m) => m.id !== mediaId),
        }));
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Failed to delete history item.');
      }
    },

    // ── Reset ──────────────────────────────────────────────────────────────────
    reset: () =>
      set({
        activeTab: 'media',
        jobFlavor: 'activity',
        uploadedFile: null,
        uploadedMedia: null,
        polygonPoints: null,
        processStatus: null,
        alerts: [],
        summary: null,
        smokingSession: null,
        smokingEvents: [],
        smokingFilename: null,
        detectFlags: { ...ALL_OFF, fall: true },
        selectedActivities: null,
        interval: 0.5,
        loiteringThreshold: 15.0,
        occupancyLimit: 5,

        // Reset viewed states
        viewedMedia: null,
        viewedStatus: null,
        viewedAlerts: [],
        viewedSummary: null,
        viewedSmokingSession: null,
        viewedSmokingEvents: [],
      }),
  }),
);

import { create } from 'zustand';
import toast from 'react-hot-toast';
import {
  listUploadedVideos,
  uploadCCTVFootage,
  deleteUploadedVideo,
  processBatchSessions,
  listAnalyticsSessions,
  getSessionDetectedPeople,
  getVisitorAnalytics,
} from '@/lib/api/peopleanalytics';
import { ApiError } from '@/types/api';
import type {
  UploadedVideo,
  AnalyticsSession,
  DetectedPerson,
  VisitorAnalytics,
} from '@/types/peopleanalytics';

type WizardStep = 'line' | 'thresholds' | 'confirm';

interface PersonAnalysisState {
  // Tab
  activeTab: 'analytics' | 'results';
  setActiveTab: (tab: 'analytics' | 'results') => void;

  // Uploads
  uploads: UploadedVideo[];
  localFiles: Record<string, File>;
  uploading: boolean;
  selectedUploadIds: string[];
  fetchUploads: () => Promise<void>;
  addUploads: (files: File[]) => Promise<void>;
  removeUpload: (videoId: string) => Promise<void>;
  toggleSelectUpload: (id: string) => void;

  // Wizard
  wizardOpen: boolean;
  wizardStep: WizardStep;
  wizardVideoIndex: number;
  wizardVideos: UploadedVideo[];
  videoLines: Record<
    string,
    { start: [number, number]; end: [number, number] } | null
  >;
  simThreshold: number;
  confThreshold: number;
  processing: boolean;
  openWizard: () => void;
  closeWizard: () => void;
  setWizardStep: (step: WizardStep) => void;
  setSimThreshold: (v: number) => void;
  setConfThreshold: (v: number) => void;
  handleLineDraw: (start: [number, number], end: [number, number]) => void;
  handleSkipLine: () => void;
  handleProcess: (
    onDone: (sessions: AnalyticsSession[]) => void,
  ) => Promise<void>;

  // Results / Sessions
  sessions: AnalyticsSession[];
  sessionsLoading: boolean;
  selectedSession: AnalyticsSession | null;
  detectedPeople: DetectedPerson[];
  loadingPeople: boolean;
  visitorStats: VisitorAnalytics | null;
  historyOpen: boolean;
  fetchSessions: () => Promise<void>;
  selectSession: (s: AnalyticsSession) => Promise<void>;
  setHistoryOpen: (v: boolean) => void;
}

function advanceWizard(
  get: () => PersonAnalysisState,
  set: (partial: Partial<PersonAnalysisState>) => void,
) {
  const { wizardVideoIndex, wizardVideos } = get();
  if (wizardVideoIndex < wizardVideos.length - 1) {
    set({ wizardVideoIndex: wizardVideoIndex + 1 });
  } else {
    set({ wizardStep: 'thresholds' });
  }
}

export const usePersonAnalysisStore = create<PersonAnalysisState>(
  (set, get) => ({
    activeTab: 'analytics',
    setActiveTab: (tab) => set({ activeTab: tab }),

    uploads: [],
    localFiles: {},
    uploading: false,
    selectedUploadIds: [],

    fetchUploads: async () => {
      try {
        const res = await listUploadedVideos();
        set({ uploads: res.data });
      } catch {
        // silent
      }
    },

    addUploads: async (files) => {
      set({ uploading: true });
      try {
        const res = await uploadCCTVFootage(files);
        toast.success(`Uploaded ${res.data.length} file(s)`);
        const fileMap: Record<string, File> = {};
        res.data.forEach((uploaded, i) => {
          if (files[i]) fileMap[uploaded.id] = files[i];
        });
        set((s) => {
          const merged = [...s.uploads];
          res.data.forEach((item) => {
            if (!merged.some((e) => e.id === item.id)) merged.push(item);
          });
          return {
            uploads: merged,
            localFiles: { ...s.localFiles, ...fileMap },
          };
        });
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      } finally {
        set({ uploading: false });
      }
    },

    removeUpload: async (videoId) => {
      try {
        await deleteUploadedVideo(videoId);
        set((s) => ({
          uploads: s.uploads.filter((u) => u.id !== videoId),
          selectedUploadIds: s.selectedUploadIds.filter((id) => id !== videoId),
          localFiles: Object.fromEntries(
            Object.entries(s.localFiles).filter(([k]) => k !== videoId),
          ),
        }));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Delete failed');
      }
    },

    toggleSelectUpload: (id) => {
      set((s) => ({
        selectedUploadIds: s.selectedUploadIds.includes(id)
          ? s.selectedUploadIds.filter((x) => x !== id)
          : [...s.selectedUploadIds, id],
      }));
    },

    wizardOpen: false,
    wizardStep: 'line',
    wizardVideoIndex: 0,
    wizardVideos: [],
    videoLines: {},
    simThreshold: 0.85,
    confThreshold: 0.3,
    processing: false,

    openWizard: () => {
      const { uploads, selectedUploadIds } = get();
      const selected = uploads.filter((u) => selectedUploadIds.includes(u.id));
      if (selected.length === 0) {
        toast.error('Select at least one video to process');
        return;
      }
      set({
        wizardVideos: selected,
        wizardStep: 'line',
        wizardVideoIndex: 0,
        videoLines: {},
        wizardOpen: true,
      });
    },

    closeWizard: () => set({ wizardOpen: false }),
    setWizardStep: (step) => set({ wizardStep: step }),
    setSimThreshold: (v) => set({ simThreshold: v }),
    setConfThreshold: (v) => set({ confThreshold: v }),

    handleLineDraw: (start, end) => {
      const { wizardVideos, wizardVideoIndex } = get();
      const video = wizardVideos[wizardVideoIndex];
      set((s) => ({
        videoLines: { ...s.videoLines, [video.id]: { start, end } },
      }));
      advanceWizard(get, set);
    },

    handleSkipLine: () => {
      const { wizardVideos, wizardVideoIndex } = get();
      const video = wizardVideos[wizardVideoIndex];
      set((s) => ({ videoLines: { ...s.videoLines, [video.id]: null } }));
      advanceWizard(get, set);
    },

    handleProcess: async (onDone) => {
      const { wizardVideos, videoLines, simThreshold, confThreshold } = get();
      set({ processing: true });
      try {
        const payload = {
          videos: wizardVideos.map((u) => {
            const lineInfo = videoLines[u.id];
            return {
              video_path: u.saved_path,
              ...(lineInfo
                ? { line_start: lineInfo.start, line_end: lineInfo.end }
                : {}),
            };
          }),
          similarity_threshold: simThreshold,
          confidence_threshold: confThreshold,
        };
        const res = await processBatchSessions(payload);
        toast.success(`Started ${res.data.length} processing session(s)`);
        set({ uploads: [], selectedUploadIds: [], wizardOpen: false });
        onDone(res.data);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : 'Processing failed',
        );
      } finally {
        set({ processing: false });
      }
    },

    sessions: [],
    sessionsLoading: false,
    selectedSession: null,
    detectedPeople: [],
    loadingPeople: false,
    visitorStats: null,
    historyOpen: false,

    fetchSessions: async () => {
      set({ sessionsLoading: true });
      try {
        const res = await listAnalyticsSessions();
        set({ sessions: res.data });
      } catch {
        // silent
      } finally {
        set({ sessionsLoading: false });
      }
    },

    selectSession: async (s) => {
      set({ selectedSession: s, historyOpen: false, activeTab: 'results' });
      if (s.status === 'completed') {
        set({ loadingPeople: true });
        try {
          const res = await getSessionDetectedPeople(s.id);
          set({ detectedPeople: res.data });
        } catch {
          set({ detectedPeople: [] });
        } finally {
          set({ loadingPeople: false });
        }
      }
    },

    setHistoryOpen: (v) => set({ historyOpen: v }),
  }),
);

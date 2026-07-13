'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Video,
  CheckCircle2,
  Sliders,
  Play,
  Layers,
  Eye,
  BarChart2,
  Activity,
  History,
  Loader2,
  X,
  ArrowRight,
  ArrowLeft,
  FolderOpen,
  Trash2,
  Plus,
  Calendar,
  ChevronRight,
  Check,
  Users,
  Clock,
  ArrowRightLeft,
  UserCheck,
  TrendingUp,
  User,
  Car,
  TrafficCone,
  Dog,
  Briefcase,
  Trophy,
  Utensils,
  Apple,
  Armchair,
  Laptop,
  Cpu,
  BookOpen,
  Wrench,
  Info,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { listGalleryMedia, getGalleryMediaUrl } from '@/lib/api/gallery';

// Object Count imports
import {
  triggerObjectAnalysis,
  deleteObjectCountMedia,
} from '@/lib/api/objectcount';
import { useObjectCountingStore } from '@/stores/objectCountingStore';
import { ConfigTab as ObjectCountConfigTab } from '@/app/services/object-counting/components/ConfigTab';
import { ResultsTab as ObjectCountResultsTab } from '@/app/services/object-counting/components/ResultsTab';
import TrackerConfiguration from '@/app/services/object-count/components/TrackerConfiguration';
import AdvancedConfiguration from '@/app/services/object-count/components/AdvancedConfiguration';
import DrawingModal from '@/app/services/object-count/components/DrawingModal';
import CocoCategorySelection from '@/app/services/object-count/components/CocoCategorySelection';
import { COCO_CLASSES } from '@/lib/services';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Person Analysis imports
import {
  processBatchSessions,
  getAnalyticsSessionDetails,
  deleteAnalyticsSession,
} from '@/lib/api/peopleanalytics';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { useAnalysisPageStore } from '@/stores/analysisPageStore';
import { ConfigureTab as PersonAnalysisConfigTab } from '@/app/services/people-analytics/components/ConfigureTab';
import { ResultsTab as PersonAnalysisResultsTab } from '@/app/services/people-analytics/components/ResultsTab';

// Activity Detection imports
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import type { ActivityDetectorId } from '@/stores/activityDetectionStore';
import {
  DETECTOR_CATALOG,
  getDetectorDef,
} from '@/app/services/activity-detection/activity/components/ActivityDetectorSidebar';
import { PolygonCanvas } from '@/app/services/activity-detection/activity/components/PolygonCanvas';
import { ResultsTab as ActivityResultsTab } from '@/app/services/activity-detection/activity/components/ResultsTab';
import { ProcessingTab as ActivityProcessingTab } from '@/app/services/activity-detection/activity/components/ProcessingTab';
import {
  SLIDER_MIN,
  SLIDER_MAX,
  stepToInterval,
  intervalToStep,
  stepLabel,
} from '@/lib/frameIntervalUtils';

import type { GalleryMedia } from '@/types/gallery';
import Link from 'next/link';
import Image from 'next/image';

interface AnalysisItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  analysisType: 'object-count' | 'person-analysis' | 'activity-detection';
  detectorId?: ActivityDetectorId;
  accentBg?: string;
  accentText?: string;
  accentBorder?: string;
  accent?: string;
}

const getCocoClassIcon = (cls: string) => {
  const lower = cls.toLowerCase();
  if (lower === 'person') return User;
  if (
    [
      'bicycle',
      'car',
      'motorcycle',
      'airplane',
      'bus',
      'train',
      'truck',
      'boat',
    ].includes(lower)
  )
    return Car;
  if (
    ['traffic light', 'fire hydrant', 'stop sign', 'parking meter'].includes(
      lower,
    )
  )
    return TrafficCone;
  if (
    [
      'bird',
      'cat',
      'dog',
      'horse',
      'sheep',
      'cow',
      'elephant',
      'bear',
      'zebra',
      'giraffe',
    ].includes(lower)
  )
    return Dog;
  if (['backpack', 'umbrella', 'handbag', 'tie', 'suitcase'].includes(lower))
    return Briefcase;
  if (
    [
      'frisbee',
      'skis',
      'snowboard',
      'sports ball',
      'kite',
      'baseball bat',
      'baseball glove',
      'skateboard',
      'surfboard',
      'tennis racket',
    ].includes(lower)
  )
    return Trophy;
  if (
    ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl'].includes(
      lower,
    )
  )
    return Utensils;
  if (
    [
      'banana',
      'apple',
      'sandwich',
      'orange',
      'broccoli',
      'carrot',
      'hot dog',
      'pizza',
      'donut',
      'cake',
    ].includes(lower)
  )
    return Apple;
  if (
    [
      'bench',
      'chair',
      'couch',
      'potted plant',
      'bed',
      'dining table',
      'toilet',
    ].includes(lower)
  )
    return Armchair;
  if (
    ['tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone'].includes(
      lower,
    )
  )
    return Laptop;
  if (['microwave', 'oven', 'toaster', 'sink', 'refrigerator'].includes(lower))
    return Cpu;
  if (['book', 'clock', 'vase', 'teddy bear'].includes(lower)) return BookOpen;
  if (['scissors', 'hair drier', 'toothbrush'].includes(lower)) return Wrench;
  return BarChart2;
};

const getUnifiedAnalysisItems = (): AnalysisItem[] => {
  const items: AnalysisItem[] = [
    {
      id: 'person-analysis',
      label: 'People Analytics',
      description:
        'Identify crossing gates, staff vs guest splits, and occupancy count.',
      icon: Eye,
      analysisType: 'person-analysis',
      accentBg: 'bg-violet-500/10',
      accentText: 'text-violet-400',
      accentBorder: 'border-violet-500/40',
      accent: '#8B5CF6',
    },
  ];

  COCO_CLASSES.forEach((cls) => {
    items.push({
      id: `object-count-${cls}`,
      label:
        cls
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ') + ' Count',
      description: `Count and track ${cls} items in the video feed using YOLOv8.`,
      icon: getCocoClassIcon(cls),
      analysisType: 'object-count',
      accentBg: 'bg-[#1565C0]/10',
      accentText: 'text-[#60A5FA]',
      accentBorder: 'border-[#1565C0]/40',
      accent: '#1565C0',
    });
  });

  DETECTOR_CATALOG.filter((d) => d.status === 'live').forEach((det) => {
    items.push({
      id: `activity-${det.id}`,
      label: det.label,
      description: det.description,
      icon: det.Icon,
      analysisType: 'activity-detection',
      detectorId: det.id,
      accentBg: det.accentBg,
      accentText: det.accentText,
      accentBorder: det.accentBorder,
      accent: det.accent,
    });
  });

  return items;
};

type Step = 'history' | 'upload' | 'select' | 'configure' | 'run' | 'results';
type ResultsTabName = 'object-count' | 'person-analysis' | 'activity-detection';

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    processing: 'bg-blue-400/10 text-blue-400 border-blue-400/20 animate-pulse',
    completed: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    failed: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
        statusColors[status] ||
          'border-[#1E3048] bg-[#1E3048]/30 text-[#5A7A9A]',
      )}
    >
      {status}
    </span>
  );
}

function AnalysisPageContent() {
  const router = useRouter();
  const {
    activeStep,
    setActiveStep,
    activeResultsTab,
    setActiveResultsTab,
    uploadedMedia,
    setUploadedMedia,
    galleryList,
    loadingGallery,
    fetchGalleryList,
    selectedAnalyses,
    setSelectedAnalyses,
    toggleAnalysis,
    clearMedia,
    selectedActivityDetector,
    setSelectedActivityDetector,
  } = useAnalysisPageStore();

  const {
    media: objectCountRuns,
    selectedMediaId: objectCountMediaId,
    details: objectCountDetails,
    fetchMedia: fetchObjectCountRuns,
    fetchDetails: fetchObjectCountDetails,
    trackPeople: ocTrackPeople,
    setTrackPeople: setOcTrackPeople,
    classifyGender: ocClassifyGender,
    setClassifyGender: setOcClassifyGender,
    trackVehicles: ocTrackVehicles,
    setTrackVehicles: setOcTrackVehicles,
    classifyVehicle: ocClassifyVehicle,
    setClassifyVehicle: setOcClassifyVehicle,
    trackCustom: ocTrackCustom,
    setTrackCustom: setOcTrackCustom,
    selectedCustomClasses: ocSelectedCustomClasses,
    setSelectedCustomClasses: setOcSelectedCustomClasses,
    customSearchQuery: ocCustomSearchQuery,
    setCustomSearchQuery: setOcCustomSearchQuery,
    toggleCustomClass,
    confidenceThreshold: ocConfidence,
    setConfidenceThreshold: setOcConfidence,
    minTrackFrames: ocMinTrackFrames,
    setMinTrackFrames: setOcMinTrackFrames,
    trackBuffer: ocTrackBuffer,
    setTrackBuffer: setOcTrackBuffer,
    gmcMethod: ocGmc,
    setGmcMethod: setOcGmc,
    imgsz: ocResolution,
    setImgsz: setOcResolution,
    reidClasses: ocReidClasses,
    setReidClasses: setOcReidClasses,
    entryExitReport: ocEntryExitReport,
    setEntryExitReport: setOcEntryExitReport,
    lineCoords: ocLineCoords,
    setLineCoords: setOcLineCoords,
    isDrawingModalOpen: ocIsDrawingModalOpen,
    setIsDrawingModalOpen: setOcIsDrawingModalOpen,
    triggeringAnalysisId,
    triggerAnalysis,
    device: ocDevice,
    setDevice: setOcDevice,
  } = useObjectCountingStore();

  const availableReidClasses = useObjectCountingStore
    .getState()
    .getActiveClassesToTrack();

  const filteredCocoClasses = COCO_CLASSES.filter(
    (c) =>
      c.toLowerCase().includes(ocCustomSearchQuery.toLowerCase()) &&
      c !== 'person' &&
      !['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(c),
  );

  // Person Analysis Store Hooks
  const {
    sessions: personRuns,
    selectedSession: personSession,
    wizardStep: personWizardStep,
    fetchSessions: fetchPersonSessions,
    processing: personProcessing,
    handleProcess: handlePersonProcess,
    selectSession: selectPersonSession,
  } = usePersonAnalysisStore();
  const personSessionId = personSession?.id;

  const selectedClassName = ocTrackPeople
    ? 'Person'
    : ocSelectedCustomClasses.length > 0
      ? ocSelectedCustomClasses
          .map((c) => c.charAt(0).toUpperCase() + c.slice(1))
          .join(', ')
      : 'Object';

  // Activity Detection Store Hooks
  const {
    detectFlags: actDetectFlags,
    setFlag: actSetFlag,
    polygonPoints: actPolygonPoints,
    setPolygonPoints: actSetPolygonPoints,
    loiteringThreshold: actLoiteringThreshold,
    setLoiteringThreshold: actSetLoiteringThreshold,
    occupancyLimit: actOccupancyLimit,
    setOccupancyLimit: actSetOccupancyLimit,
    interval: actInterval,
    setInterval: actSetInterval,
    processStatus: actProcessStatus,
    smokingSession: actSmokingSession,
    jobFlavor: actJobFlavor,
    applyDetectorDefaults: actApplyDefaults,
    initFromGalleryMedia: actInitFromGallery,
    startProcessingFromGallery: actStartProcessing,
    startSmokingFromGallery: actStartSmoking,
    pollStatus: actPollStatus,
    submitting: actSubmitting,
    unifiedHistory: actHistory,
    fetchHistory: actFetchHistory,
  } = useActivityDetectionStore();

  const actSliderStep = intervalToStep(actInterval);
  const actShowROI = actDetectFlags.loitering || actDetectFlags.intrusion;
  const actCanRun =
    !actSubmitting &&
    !!uploadedMedia &&
    (!actShowROI || actPolygonPoints !== null);

  const handleSelectAnalysis = (item: AnalysisItem) => {
    if (item.analysisType === 'object-count') {
      setSelectedAnalyses({
        objectCount: true,
        personAnalysis: false,
        activityDetection: false,
      });
      setSelectedActivityDetector(null);

      // Set the selected class in the store
      const className = item.id.replace('object-count-', '');
      const store = useObjectCountingStore.getState();
      if (className === 'person') {
        store.setTrackPeople(true);
        store.setTrackVehicles(false);
        store.setTrackCustom(false);
        store.setSelectedCustomClasses([]);
      } else {
        store.setTrackPeople(false);
        store.setTrackVehicles(false);
        store.setTrackCustom(true);
        store.setSelectedCustomClasses([className]);
      }
    } else if (item.analysisType === 'person-analysis') {
      setSelectedAnalyses({
        objectCount: false,
        personAnalysis: true,
        activityDetection: false,
      });
      setSelectedActivityDetector(null);
    } else if (item.analysisType === 'activity-detection') {
      setSelectedAnalyses({
        objectCount: false,
        personAnalysis: false,
        activityDetection: true,
      });
      setSelectedActivityDetector(item.detectorId || null);

      // Auto-apply defaults for selected activity detector
      if (item.detectorId) {
        actApplyDefaults(item.detectorId);
      }
    }
    setActiveStep('configure');
  };

  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');

  // Auto-check analysis if loaded from service links
  useEffect(() => {
    if (mode) {
      setSelectedAnalyses({
        objectCount: mode === 'object-count',
        personAnalysis: mode === 'people-analytics',
        activityDetection: mode === 'activity-detection',
      });
      // If a mode query is present, launch the upload step immediately
      setActiveStep('upload');
      if (mode === 'object-count') {
        setActiveResultsTab('object-count');
        const store = useObjectCountingStore.getState();
        store.setTrackPeople(true);
        store.setTrackVehicles(false);
        store.setTrackCustom(false);
        store.setSelectedCustomClasses([]);
      } else if (mode === 'people-analytics') {
        setActiveResultsTab('person-analysis');
      }
    }
  }, [mode, setSelectedAnalyses, setActiveStep, setActiveResultsTab]);

  const loadHistory = useCallback(async () => {
    await Promise.allSettled([
      fetchObjectCountRuns(),
      fetchPersonSessions(),
      actFetchHistory(),
    ]);
  }, [fetchObjectCountRuns, fetchPersonSessions, actFetchHistory]);

  useEffect(() => {
    if (activeStep === 'history') {
      loadHistory();
    }
  }, [activeStep, loadHistory]);

  useEffect(() => {
    if (activeStep === 'upload') {
      fetchGalleryList();
    }
  }, [activeStep, fetchGalleryList]);

  const hasSelection = Object.values(selectedAnalyses).some(Boolean);

  // Sync selection to Object Counting, Person Analysis & Activity stores on transition to Configure
  useEffect(() => {
    if (activeStep === 'configure' && uploadedMedia) {
      if (selectedAnalyses.objectCount) {
        useObjectCountingStore.setState({
          selectedMediaId: uploadedMedia.id,
          details: {
            id: uploadedMedia.id,
            gallery_media_id: uploadedMedia.id,
            status: 'pending',
            filename: uploadedMedia.filename,
            filepath: uploadedMedia.filepath,
            media_type: uploadedMedia.media_type,
            created_at: uploadedMedia.created_at,
            classify_gender: false,
            classify_vehicle: false,
            classes_to_track: [],
          } as any,
        });
      }

      if (selectedAnalyses.personAnalysis) {
        usePersonAnalysisStore.setState({
          wizardVideos: [
            {
              id: uploadedMedia.id,
              tenant_id: uploadedMedia.tenant_id,
              original_name: uploadedMedia.filename,
              saved_path: uploadedMedia.filepath,
              created_at: uploadedMedia.created_at,
            } as any,
          ],
          wizardStep: 'line',
          wizardVideoIndex: 0,
          videoLines: {},
        });
      }

      if (selectedAnalyses.activityDetection && selectedActivityDetector) {
        // Apply the chosen detector defaults and seed media
        actApplyDefaults(selectedActivityDetector);
        actInitFromGallery(uploadedMedia);
        useActivityDetectionStore.setState({
          selectedDetector: selectedActivityDetector,
          jobFlavor:
            selectedActivityDetector === 'smoking' ? 'smoking' : 'activity',
        });
      }
    }
  }, [
    activeStep,
    selectedAnalyses.objectCount,
    selectedAnalyses.personAnalysis,
    selectedAnalyses.activityDetection,
    selectedActivityDetector,
    uploadedMedia,
    actApplyDefaults,
    actInitFromGallery,
  ]);

  const handlePersonProcessWrapper = async () => {
    await handlePersonProcess((newSessions) => {
      fetchPersonSessions();
      if (newSessions.length > 0) {
        selectPersonSession(newSessions[0]);
      }
      setActiveStep('results');
      setActiveResultsTab('person-analysis');
    });
  };

  // Polling for Object Count status in Results step
  useEffect(() => {
    if (
      activeStep !== 'results' ||
      !selectedAnalyses.objectCount ||
      !objectCountMediaId
    )
      return;

    const status = objectCountDetails?.status;
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(() => {
        fetchObjectCountDetails(objectCountMediaId);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [
    activeStep,
    selectedAnalyses.objectCount,
    objectCountMediaId,
    objectCountDetails?.status,
    fetchObjectCountDetails,
  ]);

  // Polling for Person Analysis status in Results step
  useEffect(() => {
    if (
      activeStep !== 'results' ||
      !selectedAnalyses.personAnalysis ||
      !personSessionId
    )
      return;

    const status = personSession?.status;
    if (status === 'pending' || status === 'processing') {
      const interval = setInterval(async () => {
        try {
          const res = await getAnalyticsSessionDetails(personSessionId);
          if (res.data) {
            if (res.data.status === 'completed') {
              usePersonAnalysisStore.getState().selectSession(res.data);
            } else {
              usePersonAnalysisStore.setState({ selectedSession: res.data });
            }
          }
        } catch (err) {
          console.error('Failed to poll person analysis status', err);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [
    activeStep,
    selectedAnalyses.personAnalysis,
    personSessionId,
    personSession?.status,
  ]);

  // Polling for Activity Detection status in Results step
  useEffect(() => {
    if (activeStep !== 'results' || !selectedAnalyses.activityDetection) return;
    if (selectedActivityDetector === 'smoking') {
      const s = actSmokingSession?.status;
      if (!actSmokingSession || s === 'completed' || s === 'failed') return;
    } else {
      const s = actProcessStatus?.status;
      if (!actProcessStatus || s === 'completed' || s === 'failed') return;
    }
    const timer = setInterval(() => actPollStatus(), 10_000);
    return () => clearInterval(timer);
  }, [
    activeStep,
    selectedAnalyses.activityDetection,
    selectedActivityDetector,
    actSmokingSession,
    actProcessStatus,
    actPollStatus,
  ]);

  // Auto-back to history if media is deleted
  useEffect(() => {
    if (activeStep === 'results') {
      if (selectedAnalyses.objectCount && !objectCountMediaId) {
        clearMedia();
      } else if (selectedAnalyses.personAnalysis && !personSessionId) {
        clearMedia();
      }
    }
  }, [
    objectCountMediaId,
    personSessionId,
    activeStep,
    selectedAnalyses.objectCount,
    selectedAnalyses.personAnalysis,
    clearMedia,
  ]);

  const selectGalleryMedia = (item: GalleryMedia) => {
    if (uploadedMedia?.id === item.id) {
      setUploadedMedia(null);
      toast.success(`Deselected "${item.filename}"`);
    } else {
      setUploadedMedia(item);
      toast.success(`Selected "${item.filename}"`);
    }
  };

  // Unified Run triggers
  const [running, setRunning] = useState(false);
  const [showPersonVideoPreview, setShowPersonVideoPreview] = useState(false);
  const [showPersonConfigVideoPreview, setShowPersonConfigVideoPreview] =
    useState(false);

  const runAnalyses = async () => {
    if (!uploadedMedia) return;
    setRunning(true);
    try {
      // 1. Run Object Counting
      if (selectedAnalyses.objectCount) {
        const store = useObjectCountingStore.getState();
        const classesToTrack = store.getActiveClassesToTrack();
        const config = {
          classes_to_track: classesToTrack.length > 0 ? classesToTrack : null,
          classify_gender: store.trackPeople ? store.classifyGender : false,
          classify_vehicle: store.trackVehicles ? store.classifyVehicle : false,
          confidence_threshold: store.confidenceThreshold,
          min_track_frames: store.minTrackFrames,
          track_buffer: store.trackBuffer,
          entry_exit_report: store.entryExitReport,
          line_coords: store.entryExitReport ? store.lineCoords : null,
          gmc_method: store.gmcMethod,
          reid_classes: store.reidClasses.length > 0 ? store.reidClasses : null,
          imgsz: store.imgsz,
        };

        const res = await triggerObjectAnalysis(uploadedMedia.id, config);
        useObjectCountingStore.setState({
          selectedMediaId: res.data.id,
          details: { ...res.data, results: [] },
        });
        toast.success('Object counting analysis triggered!');
        setActiveResultsTab('object-count');
      }

      // 2. Run Person Analysis
      if (selectedAnalyses.personAnalysis) {
        const store = usePersonAnalysisStore.getState();
        const lineInfo = store.videoLines[uploadedMedia.id];
        const payload = {
          videos: [
            {
              gallery_media_id: uploadedMedia.id,
              ...(lineInfo
                ? { line_start: lineInfo.start, line_end: lineInfo.end }
                : {}),
            },
          ],
          similarity_threshold: store.simThreshold,
          confidence_threshold: store.confThreshold,
        };

        const res = await processBatchSessions(payload);
        if (res.data && res.data.length > 0) {
          usePersonAnalysisStore.setState({
            selectedSession: res.data[0],
            activeTab: 'results',
          });
          toast.success('Person analysis triggered!');
          if (!selectedAnalyses.objectCount) {
            setActiveResultsTab('person-analysis');
          }
        }
      }

      // 3. Run Activity Detection
      if (selectedAnalyses.activityDetection && selectedActivityDetector) {
        if (selectedActivityDetector === 'smoking') {
          await actStartSmoking(uploadedMedia);
        } else {
          await actStartProcessing(uploadedMedia);
        }
        setActiveResultsTab('activity-detection');
      }

      setActiveStep('results');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start analysis');
    } finally {
      setRunning(false);
    }
  };

  // Click handler to select and view history details (routes to the standalone History page)
  const viewHistoryItem = (item: {
    id: string;
    type: 'object-count' | 'person-analysis' | 'activity-detection';
  }) => {
    router.push(`/services/history?session_id=${item.id}&type=${item.type}`);
  };

  // Inline delete handler for history rows
  const deleteHistoryItem = async (
    id: string,
    type: 'object-count' | 'person-analysis' | 'activity-detection',
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (
      !confirm(
        'Are you sure you want to delete this previous run from the database?',
      )
    )
      return;
    try {
      if (type === 'object-count') {
        await deleteObjectCountMedia(id);
      } else if (type === 'person-analysis') {
        await deleteAnalyticsSession(id);
      } else {
        await useActivityDetectionStore.getState().removeMedia(id);
      }
      toast.success('Investigation deleted successfully');
      loadHistory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete investigation');
    }
  };

  // Merge and sort runs history chronologically
  const combinedHistory = [
    ...(objectCountRuns || []).map((run) => ({
      id: run.id,
      type: 'object-count' as const,
      filename: run.filename || 'Object Counting Run',
      filepath: run.filepath,
      status: run.status,
      created_at: run.created_at,
      originalData: run,
    })),
    ...(personRuns || []).map((run) => ({
      id: run.id,
      type: 'person-analysis' as const,
      filename: run.video_name || 'Person Analysis Session',
      filepath: run.video_path,
      status: run.status,
      created_at: run.created_at,
      originalData: run,
    })),
    ...(actHistory || []).map((run) => ({
      id: run.id,
      type: 'activity-detection' as const,
      filename:
        run.displayName ||
        (run.flavor === 'smoking'
          ? 'Smoking Detection Run'
          : 'Activity Detection Run'),
      filepath: run.filepath ?? '',
      status: run.status,
      created_at: run.created_at,
      originalData: run,
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const recentHistory = combinedHistory.slice(0, 3);

  // Check if setup is pending inside Person Analysis wizard
  const isPersonAnalysisConfiguring =
    selectedAnalyses.personAnalysis && personWizardStep !== 'confirm';

  return (
    <div className="max-w-6xl space-y-6">
      {/* CSS Override to define animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(21, 101, 192, 0.5);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 14px 4px rgba(21, 101, 192, 0.7);
            transform: scale(1.02);
          }
        }
        @keyframes slide-up {
          from {
            transform: translateY(30px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s infinite ease-in-out;
        }
        .animate-slide-up {
          animation: slide-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `,
        }}
      />

      {/* Conditionally hide Start Processing button in Person Analysis ConfigureTab when on confirm wizard step */}
      {personWizardStep === 'confirm' && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
          .people-analytics-config-wrapper .grid-cols-1 .md\\:col-span-5 > button.bg-\\[\\#1565C0\\] {
            display: none !important;
          }
        `,
          }}
        />
      )}

      {/* ΓöÇΓöÇ HEADER ROW ΓöÇΓöÇ */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            {activeStep === 'history'
              ? 'Investigations History'
              : 'New Investigation'}
          </h1>
          <p className="text-sm text-[#5A7A9A]">
            {activeStep === 'history'
              ? 'View previous computer vision run history, logs, and compiled analytics.'
              : 'Launch new custom object tracking, occupancy line, and behavior detections.'}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* New Investigation Button (Shown on History Landing Page) */}
          {activeStep === 'history' && (
            <button
              onClick={() => setActiveStep('upload')}
              className="flex items-center gap-2 rounded-lg bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#1565C0]/20 transition-all hover:bg-[#1976D2]"
            >
              <Plus className="h-4.5 w-4.5" />
              New Investigation
            </button>
          )}

          {/* Wizard Step 1 Actions: My Library & Analyse */}
          {activeStep === 'upload' && (
            <div className="flex items-center gap-2">
              <Link
                href="/services/library"
                className="flex items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3.5 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                My Library
              </Link>

              <button
                disabled={!uploadedMedia}
                onClick={() => setActiveStep('select')}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow transition-all',
                  uploadedMedia
                    ? 'animate-pulse-glow bg-[#1565C0] hover:bg-[#1976D2]'
                    : 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-50',
                )}
              >
                Analyse
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Back to History button for cancelling Wizard */}
          {activeStep !== 'history' && (
            <button
              onClick={clearMedia}
              className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3.5 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* ΓöÇΓöÇ HISTORY LANDING PAGE VIEW ΓöÇΓöÇ */}
      {activeStep === 'history' && (
        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <div className="flex items-center gap-2 border-b border-[#1E3048] pb-3">
            <History className="h-4 w-4 text-[#1565C0]" />
            <h2 className="text-sm font-semibold text-[#E8EDF5]">
              Previous Runs
            </h2>
          </div>

          {combinedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-16 text-center text-[#5A7A9A]">
              <History className="h-10 w-10 opacity-30" />
              <div>
                <p className="text-sm font-semibold text-[#E8EDF5]">
                  No previous investigations found
                </p>
                <p className="mx-auto mt-0.5 max-w-sm text-xs">
                  Start a new custom tracking session or upload media files to
                  trigger analyses.
                </p>
              </div>
              <button
                onClick={() => setActiveStep('upload')}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-3.5 py-2 text-xs font-semibold text-white shadow transition-all hover:bg-[#1976D2]"
              >
                <Plus className="h-3.5 w-3.5" /> Start New
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#E8EDF5]">
                <thead>
                  <tr className="border-b border-[#1E3048] font-semibold text-[#5A7A9A]">
                    <th className="pb-3 pl-2">Investigation Details</th>
                    <th className="pb-3">Analysis Type</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Triggered Date</th>
                    <th className="pr-2 pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3048]/50">
                  {recentHistory.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => viewHistoryItem(item)}
                      className="group cursor-pointer transition-colors hover:bg-[#1E3048]/25"
                    >
                      <td className="py-3.5 pl-2 font-medium">
                        <div className="flex max-w-[320px] items-center gap-2 sm:max-w-md">
                          {item.type === 'object-count' ? (
                            <BarChart2 className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                          ) : item.type === 'person-analysis' ? (
                            <Eye className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                          ) : (
                            <Activity className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                          )}
                          <span className="block truncate leading-none">
                            {item.filename}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 text-[#5A7A9A]">
                        {item.type === 'object-count'
                          ? 'Object Count & Track'
                          : item.type === 'person-analysis'
                            ? 'People ReID & Crossing'
                            : item.originalData.flavor === 'smoking'
                              ? 'Smoking Detection'
                              : 'Activity & Theft Detection'}
                      </td>
                      <td className="py-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3.5 text-[#5A7A9A]">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 opacity-60" />
                          {new Date(item.created_at).toLocaleDateString()}{' '}
                          {new Date(item.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) =>
                              deleteHistoryItem(item.id, item.type, e)
                            }
                            className="rounded p-1.5 text-[#5A7A9A] opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-400"
                            title="Delete Permanently"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-[#5A7A9A] transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {combinedHistory.length > 3 && (
                <div className="flex justify-end border-t border-[#1E3048]/40 pt-3">
                  <Link
                    href="/services/history"
                    className="flex items-center gap-1 text-xs font-semibold text-[#60A5FA] transition-colors hover:text-[#1565C0]"
                  >
                    View All History ({combinedHistory.length})
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ΓöÇΓöÇ WIZARD WORKFLOW (UPLOAD & CONFIGURATION STEPS) ΓöÇΓöÇ */}
      {activeStep !== 'history' && (
        <>
          {/* Steps Visual Indicator */}
          <div className="grid grid-cols-5 gap-2 rounded-xl border border-[#1E3048] bg-[#0A0F1E] p-2 text-center">
            {(['upload', 'select', 'configure', 'run', 'results'] as const).map(
              (step, idx) => {
                const isCurrent = activeStep === step;
                const isCompleted =
                  ['upload', 'select', 'configure', 'run', 'results'].indexOf(
                    activeStep,
                  ) > idx;
                const disabled = !uploadedMedia && step !== 'upload';

                return (
                  <button
                    key={step}
                    disabled={disabled}
                    onClick={() => setActiveStep(step)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-1.5 rounded-lg py-2.5 transition-colors',
                      isCurrent &&
                        'border border-[#1565C0]/30 bg-[#1565C0]/20 font-medium text-[#60A5FA]',
                      !isCurrent && 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                      isCompleted && 'text-emerald-400',
                      disabled &&
                        'cursor-not-allowed opacity-40 hover:text-[#5A7A9A]',
                    )}
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full border border-current text-[10px] font-bold">
                      {isCompleted ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        idx + 1
                      )}
                    </div>
                    <span className="hidden text-xs capitalize md:inline">
                      {step === 'select' ? 'Choose Analysis' : step}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          {/* Results View */}
          {activeStep === 'results' && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-[#1E3048]">
                {selectedAnalyses.objectCount && (
                  <button
                    onClick={() => setActiveResultsTab('object-count')}
                    className={cn(
                      'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                      activeResultsTab === 'object-count'
                        ? 'border-[#1565C0] text-[#E8EDF5]'
                        : 'border-transparent text-[#5A7A9A]',
                    )}
                  >
                    Object Count
                  </button>
                )}
                {selectedAnalyses.personAnalysis && (
                  <button
                    onClick={() => setActiveResultsTab('person-analysis')}
                    className={cn(
                      'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                      activeResultsTab === 'person-analysis'
                        ? 'border-[#1565C0] text-[#E8EDF5]'
                        : 'border-transparent text-[#5A7A9A]',
                    )}
                  >
                    Person Analysis
                  </button>
                )}
                {selectedAnalyses.activityDetection && (
                  <button
                    onClick={() => setActiveResultsTab('activity-detection')}
                    className={cn(
                      'border-b-2 px-4 py-2 text-sm font-semibold transition-colors',
                      activeResultsTab === 'activity-detection'
                        ? 'border-[#1565C0] text-[#E8EDF5]'
                        : 'border-transparent text-[#5A7A9A]',
                    )}
                  >
                    Activity Detection
                  </button>
                )}
              </div>

              {activeResultsTab === 'object-count' &&
                selectedAnalyses.objectCount && <ObjectCountResultsTab />}
              {activeResultsTab === 'person-analysis' &&
                selectedAnalyses.personAnalysis && <PersonAnalysisResultsTab />}
              {activeResultsTab === 'activity-detection' &&
                selectedAnalyses.activityDetection &&
                (() => {
                  const status =
                    selectedActivityDetector === 'smoking'
                      ? (actSmokingSession?.status ?? 'pending')
                      : (actProcessStatus?.status ?? 'pending');

                  if (status === 'pending' || status === 'processing') {
                    return <ActivityProcessingTab />;
                  }
                  return <ActivityResultsTab />;
                })()}
            </div>
          )}

          {/* Setup / Configuration Workflow View */}
          {activeStep !== 'results' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Wizard Step 1: Select Media (Grid of Videos only) */}
              {activeStep === 'upload' && (
                <div className="col-span-full space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                  <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                      <Video className="h-4 w-4 text-[#1565C0]" />
                      1. Select Media (Videos Only)
                    </h2>
                    <span className="text-[11px] text-[#5A7A9A]">
                      Select a single video file to analyze
                    </span>
                  </div>

                  {loadingGallery ? (
                    <div className="flex h-48 w-full items-center justify-center text-xs text-[#5A7A9A]">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading
                      video assets...
                    </div>
                  ) : galleryList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-2 rounded-xl border border-dashed border-[#1E3048] bg-[#0A0F1E]/20 py-16 text-center text-[#5A7A9A]">
                      <FolderOpen className="h-8 w-8 opacity-30" />
                      <p className="text-xs font-semibold text-[#E8EDF5]">
                        No videos in your library
                      </p>
                      <p className="mx-auto max-w-[200px] text-[10px] leading-normal">
                        Click the &quot;My Library&quot; button in the top right
                        to upload videos first.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {galleryList.map((item) => {
                        const isSelected = uploadedMedia?.id === item.id;
                        return (
                          <div
                            key={item.id}
                            onClick={() => selectGalleryMedia(item)}
                            className={cn(
                              'group relative flex min-h-[160px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-[#0A0F1E] transition-all',
                              isSelected
                                ? 'border-[#1565C0] ring-1 ring-[#1565C0]/40'
                                : 'border-[#1E3048] hover:border-[#1E3048]/80',
                            )}
                          >
                            {/* Video Poster Preview */}
                            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-[#1E3048]/60 bg-black">
                              <video
                                src={`${getGalleryMediaUrl(item.filepath)}#t=0.5`}
                                preload="metadata"
                                muted
                                className="h-full w-full object-cover opacity-60 transition-opacity group-hover:opacity-85"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                <Video className="h-5 w-5 text-white/50" />
                              </div>

                              {/* Round Checkbox (top-right corner) */}
                              <div
                                className={cn(
                                  'absolute top-2.5 right-2.5 z-10 flex h-4.5 w-4.5 items-center justify-center rounded-full border transition-all',
                                  isSelected
                                    ? 'border-[#60A5FA] bg-[#1565C0] text-white'
                                    : 'border-[#1E3048] bg-black/60 text-transparent',
                                )}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                )}
                              </div>
                            </div>

                            {/* Details */}
                            <div className="min-w-0 p-3">
                              <span
                                className="block truncate text-xs font-semibold text-[#E8EDF5]"
                                title={item.filename}
                              >
                                {item.filename}
                              </span>
                              <p className="mt-0.5 text-[9px] text-[#5A7A9A]">
                                {new Date(item.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Floating Action Bar for Step 1 selection */}
              {activeStep === 'upload' && uploadedMedia && (
                <div className="animate-slide-up fixed right-6 bottom-6 z-50 w-full max-w-sm">
                  <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0A0F1E]/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-md">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1565C0]/20 text-[#60A5FA]">
                        <Video className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                          Ready to Analyse
                        </p>
                        <p className="truncate text-xs font-bold text-[#E8EDF5]">
                          {uploadedMedia.filename}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveStep('select')}
                      className="animate-pulse-glow flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#1565C0]/40 transition-all hover:bg-[#1976D2]"
                    >
                      Analyse Video
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {activeStep !== 'upload' && (
                <>
                  {/* Left Column: Media Preview (select) / Compact Source preview (configure) */}
                  <div
                    className={cn(
                      'space-y-6',
                      activeStep === 'select'
                        ? 'lg:col-span-7'
                        : 'lg:col-span-4',
                      (activeStep === 'run' || activeStep === 'configure') &&
                        selectedAnalyses.personAnalysis
                        ? 'hidden'
                        : '',
                    )}
                  >
                    {activeStep === 'select' && (
                      <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-2xl">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                          <Video className="h-4 w-4 text-[#1565C0]" />
                          Media Preview
                        </h2>
                        {uploadedMedia ? (
                          <div className="overflow-hidden rounded-lg border border-[#1E3048] bg-black">
                            {uploadedMedia.media_type === 'video' ? (
                              <video
                                src={getGalleryMediaUrl(uploadedMedia.filepath)}
                                controls
                                preload="metadata"
                                className="h-auto max-h-[480px] w-full object-contain"
                              />
                            ) : (
                              <div className="relative aspect-video w-full">
                                <Image
                                  src={getGalleryMediaUrl(
                                    uploadedMedia.filepath,
                                  )}
                                  alt="Media preview"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-6 text-center text-[#5A7A9A]">
                            <Video className="mb-2 h-10 w-10 opacity-30" />
                            <p className="text-xs">
                              No media selected. Please go back and select a
                              video.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {(activeStep === 'configure' || activeStep === 'run') &&
                      uploadedMedia && (
                        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 shadow-xl">
                          <h3 className="text-xs font-bold tracking-wider text-[#E8EDF5] uppercase">
                            Source Media
                          </h3>
                          <div className="relative aspect-video max-h-[160px] w-full overflow-hidden rounded-lg border border-[#1E3048] bg-black">
                            {uploadedMedia.media_type === 'video' ? (
                              <video
                                src={getGalleryMediaUrl(uploadedMedia.filepath)}
                                controls
                                muted
                                preload="metadata"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="relative h-full w-full">
                                <Image
                                  src={getGalleryMediaUrl(
                                    uploadedMedia.filepath,
                                  )}
                                  alt="Source photo preview"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )}
                          </div>
                          <div className="space-y-2 rounded-lg bg-[#0A0F1E]/60 p-2.5 text-[10px]">
                            <div className="flex justify-between border-b border-[#1E3048]/40 pb-1.5">
                              <span className="text-[#5A7A9A]">Filename</span>
                              <span className="max-w-[140px] truncate font-semibold text-[#E8EDF5]">
                                {uploadedMedia.filename}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5A7A9A]">Type</span>
                              <span className="font-semibold text-[#E8EDF5] capitalize">
                                {uploadedMedia.media_type}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Right Column: Choose Analysis flat list (select) / Configurations (configure) */}
                  <div
                    className={cn(
                      'flex h-full flex-col space-y-6',
                      activeStep === 'select'
                        ? 'lg:col-span-5'
                        : 'lg:col-span-8',
                      (activeStep === 'run' || activeStep === 'configure') &&
                        selectedAnalyses.personAnalysis
                        ? 'lg:col-span-12'
                        : '',
                    )}
                  >
                    {activeStep === 'select' && (
                      <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-2xl">
                        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                          <Layers className="h-4 w-4 text-[#1565C0]" />
                          2. Choose Analysis
                        </h2>
                        <p className="text-xs text-[#5A7A9A]">
                          Select a report to generate for this video:
                        </p>

                        <div className="scrollbar-thin grid max-h-[500px] grid-cols-1 gap-2.5 overflow-y-auto pr-1">
                          {getUnifiedAnalysisItems().map((item) => {
                            const disabled = !uploadedMedia;
                            const Icon = item.icon;
                            const isSelectedCustom =
                              ocSelectedCustomClasses.includes(
                                item.id.replace('object-count-', ''),
                              );
                            const isSelectedPerson =
                              item.id === 'object-count-person' &&
                              ocTrackPeople &&
                              !ocTrackCustom;

                            let isSelected = false;
                            if (item.analysisType === 'object-count') {
                              isSelected =
                                selectedAnalyses.objectCount &&
                                (isSelectedCustom || isSelectedPerson);
                            } else if (
                              item.analysisType === 'person-analysis'
                            ) {
                              isSelected = selectedAnalyses.personAnalysis;
                            } else if (
                              item.analysisType === 'activity-detection'
                            ) {
                              isSelected =
                                selectedAnalyses.activityDetection &&
                                selectedActivityDetector === item.detectorId;
                            }

                            const typeTextColor =
                              item.analysisType === 'object-count'
                                ? 'text-amber-400'
                                : item.analysisType === 'person-analysis'
                                  ? 'text-sky-400'
                                  : 'text-emerald-400';

                            return (
                              <div
                                key={item.id}
                                onClick={() => {
                                  if (disabled) {
                                    toast.error(
                                      'Please select a video file first.',
                                    );
                                    return;
                                  }
                                  handleSelectAnalysis(item);
                                }}
                                className={cn(
                                  'flex items-start gap-3 rounded-lg border p-3.5 transition-all duration-150 select-none',
                                  isSelected
                                    ? `${item.accentBg} ${item.accentBorder}`
                                    : 'border-[#1E3048] bg-[#0A0F1E]',
                                  disabled
                                    ? 'cursor-not-allowed opacity-40'
                                    : 'cursor-pointer hover:border-[#1E3048]/80 hover:bg-[#0A0F1E]/65',
                                )}
                              >
                                <div
                                  className={cn(
                                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                                    isSelected
                                      ? item.accentBorder
                                      : 'border-[#1E3048]',
                                  )}
                                >
                                  {isSelected && (
                                    <div
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: item.accent }}
                                    />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 space-y-0.5">
                                  <span
                                    className={cn(
                                      'flex items-center gap-1.5 text-xs font-semibold',
                                      typeTextColor,
                                    )}
                                  >
                                    <Icon className="h-3.5 w-3.5 shrink-0" />
                                    {item.label}
                                  </span>
                                  <p className="line-clamp-2 text-[10px] leading-relaxed text-[#5A7A9A]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeStep === 'configure' && (
                      <div className="flex h-full flex-1 flex-col space-y-6">
                        {selectedAnalyses.objectCount && (
                          <div className="object-counting-config-wrapper space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                <BarChart2 className="h-4 w-4 text-[#1565C0]" />
                                Configure {selectedClassName} Count
                              </h2>
                              <button
                                onClick={() => setActiveStep('select')}
                                className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" /> Back to
                                select
                              </button>
                            </div>

                            {uploadedMedia && (
                              <div className="space-y-4">
                                <AdvancedConfiguration
                                  confidenceThreshold={ocConfidence}
                                  setConfidenceThreshold={setOcConfidence}
                                  minTrackFrames={ocMinTrackFrames}
                                  setMinTrackFrames={setOcMinTrackFrames}
                                  trackBuffer={ocTrackBuffer}
                                  setTrackBuffer={setOcTrackBuffer}
                                  gmcMethod={ocGmc}
                                  setGmcMethod={setOcGmc}
                                  imgsz={ocResolution}
                                  setImgsz={setOcResolution}
                                  device={ocDevice}
                                  setDevice={setOcDevice}
                                  availableReidClasses={availableReidClasses}
                                  reidClasses={ocReidClasses}
                                  setReidClasses={setOcReidClasses}
                                  details={
                                    {
                                      id: uploadedMedia.id,
                                      status: 'pending',
                                    } as any
                                  }
                                  triggeringAnalysisId={null}
                                  handleTriggerAnalysis={() => {}}
                                  trackPeople={ocTrackPeople}
                                  trackVehicles={ocTrackVehicles}
                                  trackCustom={ocTrackCustom}
                                  selectedCustomClasses={
                                    ocSelectedCustomClasses
                                  }
                                  hideRunButton={true}
                                />
                                <div className="mt-4 flex justify-end">
                                  <button
                                    onClick={() => setActiveStep('run')}
                                    className="flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#1565C0]/20 transition-all hover:bg-[#1976D2]"
                                  >
                                    Confirm my Configuration
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {selectedAnalyses.personAnalysis && (
                          <div className="people-analytics-config-wrapper flex h-full flex-1 flex-col space-y-4">
                            {/* Configure header with PlayCircle toggle + Confirm */}
                            <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setActiveStep('select')}
                                  className="flex items-center gap-1 rounded-md border border-[#1E3048] px-2.5 py-1.5 text-[11px] text-[#5A7A9A] transition-colors hover:border-[#1565C0]/40 hover:text-[#E8EDF5]"
                                >
                                  <ArrowLeft className="h-3 w-3" /> Back
                                </button>
                                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                  <Users className="h-4 w-4 text-[#1565C0]" />
                                  Configure People Analytics
                                </h2>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Video preview icon toggle */}
                                {uploadedMedia && (
                                  <button
                                    title={
                                      showPersonConfigVideoPreview
                                        ? 'Hide source video'
                                        : 'Preview source video'
                                    }
                                    onClick={() =>
                                      setShowPersonConfigVideoPreview((v) => !v)
                                    }
                                    className={cn(
                                      'flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200',
                                      showPersonConfigVideoPreview
                                        ? 'border-[#1565C0] bg-[#1565C0] text-white shadow-lg shadow-[#1565C0]/50'
                                        : 'border-[#1565C0]/40 bg-[#1565C0]/10 text-[#60A5FA] hover:bg-[#1565C0]/25 hover:shadow-md hover:shadow-[#1565C0]/30',
                                    )}
                                  >
                                    <PlayCircle className="h-4 w-4" />
                                  </button>
                                )}
                                {/* Confirm button — moves to Run step */}
                                <button
                                  title="Suggestion: Draw line to get accurate results"
                                  onClick={() => setActiveStep('run')}
                                  className="flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-[#1565C0]/20 transition-all hover:bg-[#1976D2]"
                                >
                                  Confirm
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Collapsible inline video preview for configure */}
                            {showPersonConfigVideoPreview && uploadedMedia && (
                              <div className="overflow-hidden rounded-xl border border-[#1565C0]/20 bg-[#0A0F1E] shadow-lg">
                                <div className="flex items-center justify-between border-b border-[#1E3048]/60 px-3 py-2">
                                  <span className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                                    Source Video
                                  </span>
                                  <span className="max-w-[180px] truncate text-[10px] text-[#E8EDF5]">
                                    {uploadedMedia.filename}
                                  </span>
                                </div>
                                <video
                                  src={getGalleryMediaUrl(
                                    uploadedMedia.filepath,
                                  )}
                                  controls
                                  preload="metadata"
                                  className="max-h-[220px] w-full object-contain"
                                />
                              </div>
                            )}

                            <PersonAnalysisConfigTab
                              showThresholds={false}
                              isReadOnly={false}
                              onRun={handlePersonProcessWrapper}
                              running={personProcessing}
                            />
                          </div>
                        )}

                        {/* Activity Detection configure */}
                        {selectedAnalyses.activityDetection &&
                          selectedActivityDetector &&
                          (() => {
                            const det = getDetectorDef(
                              selectedActivityDetector,
                            );
                            const DetIcon = det.Icon;
                            if (selectedActivityDetector === 'smoking') {
                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                      <Activity className="h-4 w-4 text-[#1565C0]" />
                                      Configure Activity Detection
                                    </h2>
                                    <button
                                      onClick={() => setActiveStep('select')}
                                      className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                                    >
                                      <ArrowLeft className="h-3.5 w-3.5" /> Back
                                    </button>
                                  </div>
                                  {/* Smoking — info only, no extra config */}
                                  <div
                                    className={`rounded-xl border p-5 ${det.accentBorder}`}
                                    style={{ background: `${det.accent}10` }}
                                  >
                                    <div className="mb-4 flex items-center gap-3">
                                      <div
                                        className="rounded-xl p-3"
                                        style={{
                                          background: `${det.accent}20`,
                                        }}
                                      >
                                        <DetIcon
                                          className="h-6 w-6"
                                          style={{ color: det.accent }}
                                        />
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-[#E8EDF5]">
                                          {det.label}
                                        </p>
                                        <p className="text-xs text-[#5A7A9A]">
                                          {det.description}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="space-y-2.5">
                                      {[
                                        {
                                          e: '🚬',
                                          t: 'Cigarette Detection',
                                          d: 'YOLOv8 detector trained to identify cigarettes in any lighting.',
                                        },
                                        {
                                          e: '🔥',
                                          t: 'Lit Tip Confirmation',
                                          d: 'Colour-temperature analysis confirms active burning tip.',
                                        },
                                        {
                                          e: '💨',
                                          t: 'Smoke Plume Analysis',
                                          d: 'Optical flow detects rising smoke linked to the detected object.',
                                        },
                                        {
                                          e: '🧠',
                                          t: 'Multi-Signal Fusion',
                                          d: 'All signals combined into a confidence score.',
                                        },
                                      ].map(({ e, t, d }) => (
                                        <div
                                          key={t}
                                          className="flex items-start gap-3"
                                        >
                                          <span className="mt-0.5 text-base leading-none">
                                            {e}
                                          </span>
                                          <div>
                                            <p className="text-xs font-semibold text-[#E8EDF5]">
                                              {t}
                                            </p>
                                            <p className="mt-0.5 text-[11px] text-[#5A7A9A]">
                                              {d}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {/* Frame interval */}
                                  <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                      <span className="text-xs font-medium text-[#5A7A9A]">
                                        Frame sampling interval
                                      </span>
                                      <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-[#E8EDF5]">
                                        {stepLabel(actSliderStep)}
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min={SLIDER_MIN}
                                      max={SLIDER_MAX}
                                      step={1}
                                      value={actSliderStep}
                                      onChange={(e) =>
                                        actSetInterval(
                                          stepToInterval(
                                            Number(e.target.value),
                                          ),
                                        )
                                      }
                                      className="w-full accent-amber-500"
                                    />
                                    <div className="mt-1 flex justify-between text-[9px] text-[#5A7A9A]">
                                      <span>1 frame</span>
                                      <span>← 1.0s →</span>
                                      <span>5.0s</span>
                                    </div>
                                  </div>
                                  <div className="flex justify-end">
                                    <button
                                      onClick={() => setActiveStep('run')}
                                      className="flex items-center gap-1.5 rounded-lg bg-[#1565C0] px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#1976D2]"
                                    >
                                      Confirm my Configuration
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            }
                            // Generic activity detector config
                            const DETECTOR_TO_FLAG: Record<
                              string,
                              keyof typeof actDetectFlags
                            > = {
                              fall: 'fall',
                              fighting: 'aggression',
                              trespassing: 'intrusion',
                              loitering: 'loitering',
                              occupancy: 'occupancy',
                              sleeping: 'sleeping',
                              walking: 'walking',
                            };
                            const primaryFlagKey =
                              DETECTOR_TO_FLAG[selectedActivityDetector];
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                                  <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                    <Activity className="h-4 w-4 text-[#1565C0]" />
                                    Configure — {det.label}
                                  </h2>
                                  <button
                                    onClick={() => setActiveStep('select')}
                                    className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                                  >
                                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                                  </button>
                                </div>
                                {/* Detector header */}
                                <div
                                  className={`flex items-center gap-3 rounded-xl border p-4 ${det.accentBorder}`}
                                  style={{ background: `${det.accent}10` }}
                                >
                                  <div
                                    className="rounded-xl p-2.5"
                                    style={{ background: `${det.accent}20` }}
                                  >
                                    <DetIcon
                                      className="h-5 w-5"
                                      style={{ color: det.accent }}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-[#E8EDF5]">
                                      {det.label}
                                    </p>
                                    <p className="text-[11px] text-[#5A7A9A]">
                                      {det.description}
                                    </p>
                                  </div>
                                </div>
                                {/* Polygon ROI if needed */}
                                {actShowROI && uploadedMedia && (
                                  <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                                    <p className="mb-2 text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                                      Region of Interest (ROI)
                                    </p>
                                    <p className="mb-3 text-[11px] text-[#5A7A9A]">
                                      Draw a polygon zone used for {det.label}.
                                    </p>
                                    <PolygonCanvas
                                      localFile={null}
                                      savedPath={uploadedMedia.filepath}
                                      mediaType="video"
                                      required={actShowROI}
                                      onConfirm={(pts) =>
                                        actSetPolygonPoints(pts)
                                      }
                                      onClear={() => actSetPolygonPoints(null)}
                                    />
                                  </div>
                                )}
                                {/* Loitering threshold */}
                                {actDetectFlags.loitering && (
                                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                      <label className="text-xs font-medium text-[#E8EDF5]">
                                        Loitering threshold time
                                      </label>
                                      <span className="text-xs font-bold text-amber-400">
                                        {actLoiteringThreshold} seconds
                                      </span>
                                    </div>
                                    <input
                                      type="range"
                                      min={5}
                                      max={120}
                                      step={5}
                                      value={actLoiteringThreshold}
                                      onChange={(e) =>
                                        actSetLoiteringThreshold(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-full accent-amber-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-[#5A7A9A]">
                                      <span>5s strict</span>
                                      <span>120s lenient</span>
                                    </div>
                                  </div>
                                )}
                                {/* Occupancy limit */}
                                {actDetectFlags.occupancy && (
                                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                      <label className="text-xs font-medium text-[#E8EDF5]">
                                        Max allowed persons
                                      </label>
                                      <span className="text-xs font-bold text-cyan-400">
                                        {actOccupancyLimit} persons
                                      </span>
                                    </div>
                                    <input
                                      type="number"
                                      min={1}
                                      max={100}
                                      value={actOccupancyLimit}
                                      onChange={(e) =>
                                        actSetOccupancyLimit(
                                          Number(e.target.value),
                                        )
                                      }
                                      className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-xs text-[#E8EDF5] outline-none focus:border-cyan-500/40"
                                    />
                                  </div>
                                )}
                                {/* Frame interval */}
                                <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                                  <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-medium text-[#5A7A9A]">
                                      Frame sampling interval
                                    </span>
                                    <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-[#E8EDF5]">
                                      {stepLabel(actSliderStep)}
                                    </span>
                                  </div>
                                  <input
                                    type="range"
                                    min={SLIDER_MIN}
                                    max={SLIDER_MAX}
                                    step={1}
                                    value={actSliderStep}
                                    onChange={(e) =>
                                      actSetInterval(
                                        stepToInterval(Number(e.target.value)),
                                      )
                                    }
                                    className="w-full accent-amber-500"
                                  />
                                  <div className="mt-1 flex justify-between text-[9px] text-[#5A7A9A]">
                                    <span>1 frame</span>
                                    <span>← 1.0s →</span>
                                    <span>5.0s</span>
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <button
                                    disabled={actShowROI && !actPolygonPoints}
                                    onClick={() => setActiveStep('run')}
                                    className={cn(
                                      'flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all',
                                      actShowROI && !actPolygonPoints
                                        ? 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-50'
                                        : 'bg-[#1565C0] hover:bg-[#1976D2]',
                                    )}
                                  >
                                    Confirm my Configuration
                                    <ArrowRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    )}

                    {activeStep === 'run' && (
                      <div className="space-y-6">
                        {selectedAnalyses.objectCount && (
                          <div className="object-counting-config-wrapper space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                              <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                <BarChart2 className="h-4 w-4 text-[#1565C0]" />
                                Run {selectedClassName} Count
                              </h2>
                              <button
                                onClick={() => setActiveStep('configure')}
                                className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" /> Edit
                                Config
                              </button>
                            </div>

                            {uploadedMedia && (
                              <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-xl">
                                <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3 text-[#E8EDF5]">
                                  <Sliders className="h-4 w-4 text-[#1565C0]" />
                                  <h3 className="text-xs font-semibold tracking-wider uppercase">
                                    Configuration Review
                                  </h3>
                                </div>

                                <div className="space-y-4">
                                  {/* Target Class */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Target Class to Track
                                      </span>
                                      <span className="rounded bg-[#1565C0]/20 px-2 py-0.5 text-xs font-semibold text-[#60A5FA]">
                                        {selectedClassName}
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        The object category that the AI will
                                        detect, track, and count in the video
                                        feed.
                                      </span>
                                    </p>
                                  </div>

                                  {/* Confidence */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Detection Confidence
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-[#E8EDF5]">
                                        {ocConfidence.toFixed(2)}
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        Minimum confidence score for detections.
                                        Higher values reduce false positives but
                                        might miss smaller/obscure objects.
                                      </span>
                                    </p>
                                  </div>

                                  {/* Min Track Duration */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Min Track Duration
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-[#E8EDF5]">
                                        {ocMinTrackFrames} frames
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        Objects must be tracked for this many
                                        frames before being counted to filter
                                        out brief glitches or errors.
                                      </span>
                                    </p>
                                  </div>

                                  {/* Memory Buffer */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Track Memory Buffer
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-[#E8EDF5]">
                                        {ocTrackBuffer} frames
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        How long the tracker remembers an object
                                        if it gets temporarily blocked/hidden
                                        behind another object.
                                      </span>
                                    </p>
                                  </div>

                                  {/* GMC Method */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Global Motion Compensation (GMC)
                                      </span>
                                      <span className="text-xs font-semibold text-[#E8EDF5] uppercase">
                                        {ocGmc}
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        Stabilizes tracking when the camera
                                        moves (panning/zooming) to prevent
                                        tracking errors.
                                      </span>
                                    </p>
                                  </div>

                                  {/* Resolution */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Inference Resolution
                                      </span>
                                      <span className="font-mono text-xs font-semibold text-[#E8EDF5]">
                                        {ocResolution}px
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        Frame resolution passed to YOLO. Higher
                                        resolution improves small object
                                        detection but increases computation
                                        time.
                                      </span>
                                    </p>
                                  </div>

                                  {/* Hardware Device */}
                                  <div className="flex flex-col gap-1 rounded-lg border border-[#1E3048]/30 bg-[#0A0F1E]/40 p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-[#E8EDF5]">
                                        Execution Device
                                      </span>
                                      <span className="text-xs font-semibold text-[#E8EDF5] capitalize">
                                        {ocDevice || 'Auto-detect'}
                                      </span>
                                    </div>
                                    <p className="flex items-start gap-1 text-[10px] leading-normal text-[#5A7A9A]">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1565C0]" />
                                      <span>
                                        The hardware hardware device (CPU/GPU)
                                        used to run the deep learning model.
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                <div className="border-t border-[#1E3048]/50 pt-4">
                                  <button
                                    disabled={running}
                                    onClick={runAnalyses}
                                    className={cn(
                                      'flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] text-sm font-semibold text-white shadow-md shadow-[#1565C0]/20 transition-all hover:bg-[#1976D2] disabled:pointer-events-none disabled:opacity-40',
                                    )}
                                  >
                                    {running ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Running Analysis...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 fill-white" />
                                        Run {selectedClassName} Count
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Person Analysis run confirmation card */}
                        {selectedAnalyses.personAnalysis && (
                          <div className="people-analytics-run-wrapper space-y-4">
                            <div className="flex items-center justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => setActiveStep('configure')}
                                  className="flex items-center gap-1 rounded-md border border-[#1E3048] px-2.5 py-1.5 text-[11px] text-[#5A7A9A] transition-colors hover:border-[#1565C0]/40 hover:text-[#E8EDF5]"
                                >
                                  <ArrowLeft className="h-3 w-3" /> Edit Config
                                </button>
                                <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                  <Users className="h-4 w-4 text-[#1565C0]" />
                                  Run People Analytics
                                </h2>
                              </div>
                              {/* Video preview icon toggle */}
                              {uploadedMedia && (
                                <button
                                  title={
                                    showPersonVideoPreview
                                      ? 'Hide source video'
                                      : 'Preview source video'
                                  }
                                  onClick={() =>
                                    setShowPersonVideoPreview((v) => !v)
                                  }
                                  className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200',
                                    showPersonVideoPreview
                                      ? 'border-[#1565C0] bg-[#1565C0] text-white shadow-lg shadow-[#1565C0]/50'
                                      : 'border-[#1565C0]/40 bg-[#1565C0]/10 text-[#60A5FA] hover:bg-[#1565C0]/25 hover:shadow-md hover:shadow-[#1565C0]/30',
                                  )}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>

                            {/* Collapsible inline video preview */}
                            {showPersonVideoPreview && uploadedMedia && (
                              <div className="overflow-hidden rounded-xl border border-[#1565C0]/20 bg-[#0A0F1E] shadow-lg">
                                <div className="flex items-center justify-between border-b border-[#1E3048]/60 px-3 py-2">
                                  <span className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                                    Source Video
                                  </span>
                                  <span className="max-w-[180px] truncate text-[10px] text-[#E8EDF5]">
                                    {uploadedMedia.filename}
                                  </span>
                                </div>
                                <video
                                  src={getGalleryMediaUrl(
                                    uploadedMedia.filepath,
                                  )}
                                  controls
                                  preload="metadata"
                                  className="max-h-[220px] w-full object-contain"
                                />
                              </div>
                            )}

                            <PersonAnalysisConfigTab
                              showThresholds={true}
                              isReadOnly={true}
                              onRun={handlePersonProcessWrapper}
                              running={personProcessing}
                            />
                          </div>
                        )}

                        {/* Activity Detection run confirmation card */}

                        {selectedAnalyses.activityDetection &&
                          selectedActivityDetector &&
                          (() => {
                            const det = getDetectorDef(
                              selectedActivityDetector,
                            );
                            const DetIcon = det.Icon;
                            return (
                              <div className="space-y-4">
                                <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                                  <div className="mb-4 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#E8EDF5]">
                                      <Activity className="h-4 w-4 text-[#1565C0]" />
                                      Activity Detection — Ready to Run
                                    </h2>
                                    <button
                                      onClick={() => setActiveStep('configure')}
                                      className="flex items-center gap-1 text-xs text-[#5A7A9A] hover:text-[#E8EDF5]"
                                    >
                                      <ArrowLeft className="h-3.5 w-3.5" /> Edit
                                      Config
                                    </button>
                                  </div>
                                  <div
                                    className={`mb-4 flex items-center gap-3 rounded-xl border p-4 ${det.accentBorder}`}
                                    style={{ background: `${det.accent}10` }}
                                  >
                                    <div
                                      className="rounded-xl p-2.5"
                                      style={{ background: `${det.accent}20` }}
                                    >
                                      <DetIcon
                                        className="h-5 w-5"
                                        style={{ color: det.accent }}
                                      />
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-[#E8EDF5]">
                                        {det.label}
                                      </p>
                                      <p className="text-[11px] text-[#5A7A9A]">
                                        {det.description}
                                      </p>
                                    </div>
                                    <span
                                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${det.accentBg} ${det.accentText}`}
                                    >
                                      {stepLabel(actSliderStep)} interval
                                    </span>
                                  </div>
                                  {actShowROI && actPolygonPoints && (
                                    <p className="mb-3 text-[11px] text-emerald-400">
                                      ✓ Polygon ROI configured (
                                      {actPolygonPoints.length} points)
                                    </p>
                                  )}
                                  {actDetectFlags.loitering && (
                                    <p className="mb-1 text-[11px] text-[#5A7A9A]">
                                      Loitering threshold:{' '}
                                      <span className="font-semibold text-[#E8EDF5]">
                                        {actLoiteringThreshold}s
                                      </span>
                                    </p>
                                  )}
                                  {actDetectFlags.occupancy && (
                                    <p className="mb-1 text-[11px] text-[#5A7A9A]">
                                      Occupancy limit:{' '}
                                      <span className="font-semibold text-[#E8EDF5]">
                                        {actOccupancyLimit} persons
                                      </span>
                                    </p>
                                  )}

                                  {/* Smoking Detection — Model Preview Demo */}
                                  {selectedActivityDetector === 'smoking' && (
                                    <div className="mb-3 overflow-hidden rounded-xl border border-amber-500/20 bg-[#0A0F1E]">
                                      <div className="flex items-center justify-between border-b border-[#1E3048]/60 px-3 py-2">
                                        <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-amber-400/80 uppercase">
                                          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                                          Model Preview
                                        </span>
                                        <span className="text-[9px] text-[#5A7A9A]">
                                          Example inference output
                                        </span>
                                      </div>
                                      <div className="relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src="/smoking_detection_demo.png"
                                          alt="Smoking detection model output example — bounding boxes around cigarette and smoke plume"
                                          className="max-h-[260px] w-full object-cover object-top"
                                        />
                                        {/* Detection label overlays */}
                                        <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
                                          <span className="rounded bg-[#CCFF00]/90 px-1.5 py-0.5 text-[9px] font-bold text-black">
                                            cigarette 0.91
                                          </span>
                                          <span className="rounded bg-orange-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                            smoke_plume 0.78
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  <button
                                    disabled={running || actSubmitting}
                                    onClick={runAnalyses}
                                    className={cn(
                                      'mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-white shadow-md transition-all',
                                      running || actSubmitting
                                        ? 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-60'
                                        : 'bg-[#1565C0] shadow-[#1565C0]/20 hover:bg-[#1976D2]',
                                    )}
                                  >
                                    {running || actSubmitting ? (
                                      <>
                                        <Loader2 className="h-4 w-4 animate-spin" />{' '}
                                        Starting Analysis...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-4 w-4 fill-current" />{' '}
                                        Run {det.label}
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                      </div>
                    )}
                  </div>

                  {/* (Configure → Run button now lives in the header bar above) */}
                </>
              )}
            </div>
          )}
        </>
      )}
      {ocIsDrawingModalOpen && uploadedMedia && (
        <DrawingModal
          onClose={() => setOcIsDrawingModalOpen(false)}
          mediaUrl={`${BACKEND_URL}/${uploadedMedia.filepath}`}
          mediaType={uploadedMedia.media_type}
          onSave={(coords) => setOcLineCoords(coords)}
          initialCoords={ocLineCoords}
        />
      )}
    </div>
  );
}

export default function UnifiedAnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 w-full items-center justify-center text-sm text-[#5A7A9A]">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading...
        </div>
      }
    >
      <AnalysisPageContent />
    </Suspense>
  );
}

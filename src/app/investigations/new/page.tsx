'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ImageIcon,
  Video,
  Loader2,
  CheckCircle2,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Folder,
  Sparkles,
  Settings2,
  BarChart2,
  Users,
  Activity,
  ExternalLink,
  AlertTriangle,
  Clock,
  Car,
  Sliders,
  Play,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInvestigationStore } from '@/stores/investigationStore';
import { listMedia } from '@/lib/api/peoplefind';
import { getAnalysis } from '@/features/analyses/registry';
import { ManifestScanner } from '@/features/analyses/shared/ManifestScanner';
import type { MediaSource, AnalysisId } from '@/features/analyses/types';
import toast from 'react-hot-toast';
import { ApiError } from '@/types/api';
import {
  triggerObjectAnalysis,
  listObjectCountMedia,
  getObjectCountMediaDetails,
} from '@/lib/api/objectcount';
import type { ObjectCountMediaDetails } from '@/types/objectcount';

// Reusable results components
import AnalyticsCards from '@/app/services/object-count/components/AnalyticsCards';
import EntryExitSummary from '@/app/services/object-count/components/EntryExitSummary';
import VideoPreviewHUD from '@/app/services/object-count/components/VideoPreviewHUD';
import CategoryDistribution from '@/app/services/object-count/components/CategoryDistribution';
import DemographicsSummary from '@/app/services/object-count/components/DemographicsSummary';
import LineCrossingBreakdown from '@/app/services/object-count/components/LineCrossingBreakdown';
import TimelineResults from '@/app/services/object-count/components/TimelineResults';

// Reusable configurations components
import TrackerConfiguration from '@/app/services/object-count/components/TrackerConfiguration';
import CocoCategorySelection from '@/app/services/object-count/components/CocoCategorySelection';
import AdvancedConfiguration from '@/app/services/object-count/components/AdvancedConfiguration';
import DrawingModal from '@/app/services/object-count/components/DrawingModal';
import { ConfigureTab as PeopleConfigureTab } from '@/app/services/people-analytics/components/ConfigureTab';
import { ConfigureTab as ActivityConfigureTab } from '@/app/services/activity-detection/activity/components/ConfigureTab';

// Reusable store hooks for synchronization
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import { COCO_CLASSES } from '@/lib/services';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ── Wizard steps ──────────────────────────────────────────────────────────────
type WizardStep = 'media' | 'scan' | 'configure';

const STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'media', label: 'Select Media', icon: Folder },
  { id: 'scan', label: 'Discover', icon: Sparkles },
  { id: 'configure', label: 'Configure', icon: Settings2 },
];

function StepIndicator({
  steps,
  currentStep,
  onStepClick,
  canNavigateTo,
}: {
  steps: typeof STEPS;
  currentStep: WizardStep;
  onStepClick: (stepId: WizardStep) => void;
  canNavigateTo: (stepId: WizardStep) => boolean;
}) {
  const currentIdx = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, idx) => {
        const isActive = step.id === currentStep;
        const isCompleted = idx < currentIdx;
        const isClickable = canNavigateTo(step.id);
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  'h-px w-8 transition-colors sm:w-12',
                  isCompleted ? 'bg-[#1565C0]' : 'bg-[#1E3048]',
                )}
              />
            )}
            <button
              onClick={() => {
                if (isClickable && !isActive) {
                  onStepClick(step.id);
                }
              }}
              disabled={!isClickable}
              className={cn(
                'flex items-center gap-2 text-left disabled:cursor-not-allowed',
                isClickable && 'group cursor-pointer',
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-all',
                  isActive
                    ? 'border-[#1565C0] bg-[#1565C0] text-white'
                    : isCompleted
                      ? 'border-[#1565C0]/40 bg-[#1565C0]/10 text-[#60A5FA]'
                      : 'border-[#1E3048] bg-[#0A0F1E] text-[#5A7A9A]',
                  isClickable &&
                    !isActive &&
                    'hover:border-[#1565C0] hover:text-[#60A5FA]',
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'hidden text-xs font-medium transition-colors sm:block',
                  isActive
                    ? 'text-[#E8EDF5]'
                    : isCompleted
                      ? 'text-[#60A5FA]'
                      : 'text-[#5A7A9A]',
                  isClickable && !isActive && 'group-hover:text-[#E8EDF5]',
                )}
              >
                {step.label}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NewInvestigationPage() {
  const router = useRouter();

  const investigationMedia = useInvestigationStore((s) => s.selectedMedia);
  const clearSelectedMedia = useInvestigationStore((s) => s.clearSelectedMedia);
  const [reportTab, setReportTab] = useState<
    'object-count' | 'people-analytics' | 'activity-detection'
  >('object-count');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(false);
  const [ocConfigStep, setOcConfigStep] = useState<1 | 2 | 3>(1);

  // Object Count analysis results states
  const [details, setDetails] = useState<ObjectCountMediaDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [forceConfig, setForceConfig] = useState(false);
  const resultsVideoRef = useRef<HTMLVideoElement>(null);

  const classBreakdownData = useMemo(() => {
    if (!details?.report_summary?.unique_counts) return [];
    return Object.entries(details.report_summary.unique_counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [details]);

  const seekVideo = useCallback((time: number) => {
    if (resultsVideoRef.current) {
      resultsVideoRef.current.currentTime = time;
      resultsVideoRef.current.play().catch(() => {});
    }
  }, []);

  const formatSeconds = useCallback((sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }, []);

  const fetchMediaAndSyncDetails = useCallback(async () => {
    if (!investigationMedia) return;
    try {
      const res = await listObjectCountMedia();
      const match = res.data.find(
        (item) => item.gallery_media_id === investigationMedia.id,
      );
      if (match) {
        setForceConfig(false);
        const detailsRes = await getObjectCountMediaDetails(match.id);
        setDetails(detailsRes.data);
      } else {
        setDetails(null);
      }
    } catch (err) {
      console.error('Failed to sync details:', err);
    }
  }, [investigationMedia]);

  useEffect(() => {
    setTimeout(() => {
      fetchMediaAndSyncDetails();
    }, 0);
  }, [fetchMediaAndSyncDetails]);

  // Poll details for selected media if it's processing
  useEffect(() => {
    if (!details || forceConfig) return;
    if (details.status !== 'processing' && details.status !== 'pending') return;

    const interval = setInterval(() => {
      getObjectCountMediaDetails(details.id)
        .then((res) => {
          setDetails(res.data);
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            clearInterval(interval);
          }
        })
        .catch((err) => {
          console.error('Polling details error:', err);
        });
    }, 5000);

    return () => clearInterval(interval);
  }, [details, forceConfig]);

  useEffect(() => {
    setTimeout(() => {
      if (details && !forceConfig) {
        setIsPreviewCollapsed(true);
      } else if (isConfiguring) {
        setIsPreviewCollapsed(true);
      } else {
        setIsPreviewCollapsed(false);
      }
    }, 0);
  }, [details, forceConfig, isConfiguring]);

  // Object Count config states
  const [ocTrackPeople, setOcTrackPeople] = useState(true);
  const [ocClassifyGender, setOcClassifyGender] = useState(false);
  const [ocTrackVehicles, setOcTrackVehicles] = useState(true);
  const [ocClassifyVehicle, setOcClassifyVehicle] = useState(true);
  const [ocEntryExitReport, setOcEntryExitReport] = useState(false);
  const [ocLineCoords, setOcLineCoords] = useState<number[][] | null>(null);
  const [ocIsDrawingModalOpen, setOcIsDrawingModalOpen] = useState(false);
  const [ocTrackCustom, setOcTrackCustom] = useState(false);
  const [ocCustomSearchQuery, setOcCustomSearchQuery] = useState('');
  const [ocSelectedCustomClasses, setOcSelectedCustomClasses] = useState<
    string[]
  >([]);
  const [ocConfidence, setOcConfidence] = useState(0.35);
  const [ocMinTrackFrames, setOcMinTrackFrames] = useState(10);
  const [ocTrackBuffer, setOcTrackBuffer] = useState(30);
  const [ocGmc, setOcGmc] = useState('none');
  const [ocResolution, setOcResolution] = useState(480);
  const [ocDevice, setOcDevice] = useState<string | null>(null);
  const [ocReidClasses, setOcReidClasses] = useState<string[]>(['person']);

  useEffect(() => {
    setTimeout(() => {
      setOcTrackCustom(ocSelectedCustomClasses.length > 0);
    }, 0);
  }, [ocSelectedCustomClasses]);

  // Re-ID classes & Custom Classes computed helpers
  const getActiveClassesToTrack = useCallback((): string[] => {
    let classes: string[] = [];
    if (ocTrackCustom) {
      classes = [...ocSelectedCustomClasses];
      if (ocTrackPeople && !classes.includes('person')) {
        classes.push('person');
      }
      if (ocTrackVehicles) {
        const vClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        vClasses.forEach((vc) => {
          if (!classes.includes(vc)) {
            classes.push(vc);
          }
        });
      }
    } else {
      if (ocTrackPeople) {
        classes.push('person');
      }
      if (ocTrackVehicles) {
        classes.push('car', 'truck', 'bus', 'motorcycle', 'bicycle');
      }
    }
    return classes;
  }, [ocTrackCustom, ocSelectedCustomClasses, ocTrackPeople, ocTrackVehicles]);

  const availableReidClasses =
    getActiveClassesToTrack().length > 0
      ? getActiveClassesToTrack()
      : ['person', 'car', 'bus', 'truck', 'motorcycle', 'bicycle'];

  const filteredCocoClasses = COCO_CLASSES.filter((cls) =>
    cls.toLowerCase().includes(ocCustomSearchQuery.toLowerCase()),
  );

  const toggleCustomClass = (cls: string) => {
    if (ocSelectedCustomClasses.includes(cls)) {
      setOcSelectedCustomClasses(
        ocSelectedCustomClasses.filter((c) => c !== cls),
      );
    } else {
      setOcSelectedCustomClasses([...ocSelectedCustomClasses, cls]);
    }
  };

  const handleTriggerAnalysis = async (mediaId: string) => {
    setRunningAnalysis(true);
    let classesToTrack: string[] | null = [];

    if (ocTrackCustom) {
      if (ocSelectedCustomClasses.length === 0) {
        classesToTrack = null;
      } else {
        classesToTrack = [...ocSelectedCustomClasses];
        if (ocTrackPeople && !classesToTrack.includes('person')) {
          classesToTrack.push('person');
        }
        if (ocTrackVehicles) {
          const vClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
          vClasses.forEach((vc) => {
            if (!classesToTrack?.includes(vc)) {
              classesToTrack?.push(vc);
            }
          });
        }
      }
    } else {
      if (ocTrackPeople) {
        classesToTrack.push('person');
      }
      if (ocTrackVehicles) {
        classesToTrack.push('car', 'truck', 'bus', 'motorcycle', 'bicycle');
      }
      if (classesToTrack.length === 0) {
        classesToTrack = null;
      }
    }

    try {
      await triggerObjectAnalysis(mediaId, {
        classes_to_track: classesToTrack,
        classify_gender: ocTrackPeople ? ocClassifyGender : false,
        classify_vehicle: ocTrackVehicles ? ocClassifyVehicle : false,
        confidence_threshold: ocConfidence,
        min_track_frames: ocMinTrackFrames,
        track_buffer: ocTrackBuffer,
        entry_exit_report: ocEntryExitReport,
        line_coords: ocEntryExitReport ? ocLineCoords : null,
        gmc_method: ocGmc,
        reid_classes: ocReidClasses.length > 0 ? ocReidClasses : null,
        imgsz: ocResolution,
        device: ocDevice,
      });
      toast.success('Object tracking analysis triggered successfully!');
      setIsConfiguring(false);
      fetchMediaAndSyncDetails();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to trigger analysis',
      );
    } finally {
      setRunningAnalysis(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setIsConfiguring(false);
      setOcConfigStep(1);
    }, 0);
  }, [reportTab]);

  useEffect(() => {
    if (!isConfiguring) {
      setTimeout(() => {
        setOcConfigStep(1);
      }, 0);
    }
  }, [isConfiguring]);

  // Sync selected video to People Analytics store when it changes or when configuring People Analytics tab
  useEffect(() => {
    if (!investigationMedia) return;

    if (reportTab === 'people-analytics' && isConfiguring) {
      usePersonAnalysisStore.setState({
        wizardVideos: [
          {
            id: investigationMedia.id,
            original_name: investigationMedia.filename || 'video.mp4',
            saved_path: investigationMedia.filepath,
            status: 'pending',
            created_at: new Date().toISOString(),
          } as any,
        ],
        wizardStep: 'line',
        wizardVideoIndex: 0,
      });
    }
  }, [investigationMedia, reportTab, isConfiguring]);

  // Sync selected video to Activity Detection store when it changes or when configuring Activity Detection tab
  useEffect(() => {
    if (!investigationMedia) return;

    if (reportTab === 'activity-detection' && isConfiguring) {
      useActivityDetectionStore.setState({
        uploadedMedia: {
          id: investigationMedia.id,
          filepath: investigationMedia.filepath,
          filename: investigationMedia.filename || 'video.mp4',
          media_type: investigationMedia.mediaType || 'video',
          status: 'pending',
          created_at: new Date().toISOString(),
        } as any,
        selectedDetector: 'fall',
      });
    }
  }, [investigationMedia, reportTab, isConfiguring]);

  // Wizard state
  const [step, setStep] = useState<WizardStep>('media');
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisId | null>(
    null,
  );
  const [hasVisitedDiscover, setHasVisitedDiscover] = useState(false);
  const [hasVisitedConfigure, setHasVisitedConfigure] = useState(false);

  const handleBackToGallery = () => {
    clearSelectedMedia();
    router.push('/services/gallery');
  };

  useEffect(() => {
    if (step === 'scan') {
      setTimeout(() => setHasVisitedDiscover(true), 0);
    } else if (step === 'configure') {
      setTimeout(() => setHasVisitedConfigure(true), 0);
    }
  }, [step]);

  const canNavigateTo = useCallback(
    (targetStep: WizardStep) => {
      if (targetStep === 'media') return true;
      if (targetStep === 'scan') {
        return selectedMedia.size > 0 && hasVisitedDiscover;
      }
      if (targetStep === 'configure') {
        return (
          selectedMedia.size > 0 &&
          selectedAnalysis !== null &&
          hasVisitedConfigure
        );
      }
      return false;
    },
    [
      selectedMedia.size,
      hasVisitedDiscover,
      selectedAnalysis,
      hasVisitedConfigure,
    ],
  );

  // Media library state
  const [media, setMedia] = useState<MediaSource[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);

  const completedMedia = useMemo(
    () => media.filter((m) => m.status === 'completed'),
    [media],
  );

  const selectedMediaItems = useMemo(
    () => completedMedia.filter((m) => selectedMedia.has(m.id)),
    [completedMedia, selectedMedia],
  );

  // Fetch media
  const fetchMedia = useCallback(async () => {
    setMediaLoading(true);
    try {
      const res = await listMedia();
      setMedia(res.data);
    } catch {
      // silently fail
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      fetchMedia();
    }, 0);
  }, [fetchMedia]);

  // Selection helpers
  function toggleMedia(id: string) {
    setSelectedMedia((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedMedia(new Set(completedMedia.map((m) => m.id)));
  }

  function clearSelection() {
    setSelectedMedia(new Set());
  }

  // Navigation
  function goNext() {
    if (step === 'media' && selectedMedia.size > 0) setStep('scan');
    else if (step === 'scan' && selectedAnalysis) setStep('configure');
  }

  function goBack() {
    if (step === 'scan') {
      setStep('media');
      setSelectedAnalysis(null);
    } else if (step === 'configure') {
      setStep('scan');
    }
  }

  // Analysis submission handler
  function handleAnalysisSubmit(sessionId: string) {
    if (selectedAnalysis) {
      router.push(`/investigations/${selectedAnalysis}?sessionId=${sessionId}`);
    }
  }

  const getMediaUrl = (filepath: string) => {
    const normalized = filepath.replace(/\\/g, '/');
    return `${BACKEND_URL}/${normalized}`;
  };

  // Resolve the selected analysis config
  const analysisConfig = selectedAnalysis
    ? getAnalysis(selectedAnalysis)
    : null;
  const InputComponent = analysisConfig?.InputComponent;

  // ── Render 2-Column Investigation View ──────────────────────────────────────
  if (investigationMedia) {
    return (
      <>
        <div className="max-w-6xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleBackToGallery}
                  className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3.5 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-all hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Gallery
                </button>
                <span className="rounded-full bg-[#1565C0]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                  Investigation Active
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#E8EDF5]">
                Investigation: {investigationMedia.filename}
              </h1>
              <p className="mt-1 text-xs text-[#5A7A9A]">
                Review integrated static service reports, key logs, and alerts
                for this media file.
              </p>
            </div>
          </div>

          {/* 2 Column Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Column 1: Video Preview */}
            <div
              className={cn(
                'space-y-4 transition-all duration-300 ease-in-out',
                isPreviewCollapsed
                  ? 'h-0 overflow-hidden opacity-0 lg:col-span-0 lg:hidden'
                  : 'opacity-100 lg:col-span-5',
              )}
            >
              <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold tracking-wider text-[#5A7A9A] uppercase">
                    Source File Preview
                  </p>
                  <button
                    onClick={() => setIsPreviewCollapsed(true)}
                    className="rounded-lg p-1 text-[#5A7A9A] transition-all hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                    title="Collapse Preview"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[#1E3048] bg-black">
                  {investigationMedia.media_type === 'video' ? (
                    <video
                      src={getMediaUrl(investigationMedia.filepath)}
                      controls
                      muted
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="relative h-full w-full">
                      <Image
                        src={getMediaUrl(investigationMedia.filepath)}
                        alt="Source photo preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>

                {/* Video stats */}
                <div className="space-y-2.5 rounded-lg bg-[#0A0F1E]/60 p-3 text-xs">
                  <div className="flex justify-between border-b border-[#1E3048]/40 pb-2">
                    <span className="text-[#5A7A9A]">Name</span>
                    <span className="max-w-[180px] truncate font-semibold text-[#E8EDF5]">
                      {investigationMedia.filename}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E3048]/40 pb-2">
                    <span className="text-[#5A7A9A]">Type</span>
                    <span className="font-semibold text-[#E8EDF5] capitalize">
                      {investigationMedia.media_type}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#1E3048]/40 pb-2">
                    <span className="text-[#5A7A9A]">Created</span>
                    <span className="font-semibold text-[#E8EDF5]">
                      {new Date(
                        investigationMedia.created_at,
                      ).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5A7A9A]">File ID</span>
                    <span
                      className="max-w-[140px] truncate font-mono text-[10px] text-[#5A7A9A]"
                      title={investigationMedia.id}
                    >
                      {investigationMedia.id}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Static Reports Panel */}
            <div
              className={cn(
                'transition-all duration-300 ease-in-out',
                isPreviewCollapsed ? 'lg:col-span-12' : 'lg:col-span-7',
              )}
            >
              <div className="flex h-full flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                {/* Tab Selector */}
                <div className="flex gap-1 border-b border-[#1E3048] bg-[#0A0F1E]/80 p-1">
                  <button
                    onClick={() => setReportTab('object-count')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all',
                      reportTab === 'object-count'
                        ? 'border border-[#1E3048] bg-[#1E3048] text-[#E8EDF5] shadow-sm'
                        : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                    )}
                  >
                    <BarChart2 className="h-4 w-4 text-[#60A5FA]" />
                    Object Count
                  </button>
                  <button
                    onClick={() => setReportTab('people-analytics')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all',
                      reportTab === 'people-analytics'
                        ? 'border border-[#1E3048] bg-[#1E3048] text-[#E8EDF5] shadow-sm'
                        : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                    )}
                  >
                    <Users className="h-4 w-4 text-[#10B981]" />
                    People Analytics
                  </button>
                  <button
                    onClick={() => setReportTab('activity-detection')}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all',
                      reportTab === 'activity-detection'
                        ? 'border border-[#1E3048] bg-[#1E3048] text-[#E8EDF5] shadow-sm'
                        : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                    )}
                  >
                    <Activity className="h-4 w-4 text-[#F59E0B]" />
                    Activity Detection
                  </button>
                </div>

                {/* Configure Toggle Bar */}
                <div className="flex items-center justify-between border-b border-[#1E3048]/40 bg-[#0D1628] px-5 py-2.5">
                  <div>
                    <button
                      onClick={() => setIsPreviewCollapsed(!isPreviewCollapsed)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-all hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                    >
                      {isPreviewCollapsed
                        ? 'Show Video Preview'
                        : 'Hide Video Preview'}
                    </button>
                  </div>
                  {reportTab === 'object-count' ? (
                    details && (
                      <button
                        onClick={() => setForceConfig(!forceConfig)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3.5 py-1.5 text-xs font-semibold text-[#60A5FA] transition-all hover:bg-[#1E3048]"
                      >
                        <Settings2 className="h-3.5 w-3.5 text-[#60A5FA]" />
                        {forceConfig
                          ? 'View Tracking Results'
                          : 'Configure Tracker'}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => setIsConfiguring(!isConfiguring)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3.5 py-1.5 text-xs font-semibold text-[#60A5FA] transition-all hover:bg-[#1E3048]"
                    >
                      <Settings2 className="h-3.5 w-3.5 text-[#60A5FA]" />
                      {isConfiguring
                        ? 'View Analytics Report'
                        : 'Configure & Run Analysis'}
                    </button>
                  )}
                </div>

                {/* Tab Content Panel */}
                <div className="flex-1 space-y-5 overflow-y-auto p-5">
                  {!isConfiguring ? (
                    <>
                      {/* ── OBJECT COUNT ── */}
                      {reportTab === 'object-count' && (
                        <div className="animate-in fade-in duration-200">
                          {details && !forceConfig ? (
                            details.status === 'completed' ? (
                              <div className="space-y-6">
                                <AnalyticsCards
                                  totalUniqueTracked={
                                    details.total_objects_count
                                  }
                                  peakConcurrency={details.peak_objects_count}
                                  avgConcurrency={details.average_objects_count}
                                  videoDurationSeconds={
                                    details.video_duration_seconds
                                  }
                                />

                                {details.report_summary
                                  ?.line_crossing_analytics && (
                                  <EntryExitSummary
                                    totalEntries={
                                      details.report_summary
                                        .line_crossing_analytics.total_entries
                                    }
                                    totalExits={
                                      details.report_summary
                                        .line_crossing_analytics.total_exits
                                    }
                                  />
                                )}

                                {/* Main Analysis Pane */}
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                                  {/* Left Pane: Media Player & Breakdown Charts */}
                                  <div className="space-y-6 lg:col-span-2">
                                    <VideoPreviewHUD
                                      processedFilepath={
                                        details.processed_filepath
                                      }
                                      mediaType={details.media_type}
                                      filepath={details.filepath}
                                      backendUrl={BACKEND_URL}
                                      videoRef={resultsVideoRef}
                                      onReconfigure={() => {
                                        // Reset state variables to match currently selected media details
                                        setOcTrackPeople(
                                          details.classes_to_track
                                            ? details.classes_to_track.includes(
                                                'person',
                                              )
                                            : true,
                                        );
                                        setOcClassifyGender(
                                          details.classify_gender ?? false,
                                        );
                                        setOcTrackVehicles(
                                          details.classes_to_track
                                            ? details.classes_to_track.some(
                                                (c) =>
                                                  [
                                                    'car',
                                                    'truck',
                                                    'bus',
                                                    'motorcycle',
                                                    'bicycle',
                                                  ].includes(c),
                                              )
                                            : true,
                                        );
                                        setOcClassifyVehicle(
                                          details.classify_vehicle ?? true,
                                        );

                                        const hasCustom =
                                          !!details.classes_to_track &&
                                          details.classes_to_track.some(
                                            (c) =>
                                              c !== 'person' &&
                                              ![
                                                'car',
                                                'truck',
                                                'bus',
                                                'motorcycle',
                                                'bicycle',
                                              ].includes(c),
                                          );
                                        setOcTrackCustom(hasCustom);

                                        setOcSelectedCustomClasses(
                                          details.classes_to_track
                                            ? details.classes_to_track.filter(
                                                (c) =>
                                                  c !== 'person' &&
                                                  ![
                                                    'car',
                                                    'truck',
                                                    'bus',
                                                    'motorcycle',
                                                    'bicycle',
                                                  ].includes(c),
                                              )
                                            : [],
                                        );
                                        setOcEntryExitReport(
                                          !!details.entry_exit_report,
                                        );
                                        setOcLineCoords(
                                          details.line_coords || null,
                                        );
                                        setOcConfidence(
                                          (details as any)
                                            .confidence_threshold ?? 0.35,
                                        );
                                        setOcMinTrackFrames(
                                          (details as any).min_track_frames ??
                                            10,
                                        );
                                        setOcTrackBuffer(
                                          (details as any).track_buffer ?? 30,
                                        );
                                        setOcGmc(
                                          (details as any).gmc_method || 'none',
                                        );
                                        setOcResolution(
                                          (details as any).imgsz || 480,
                                        );
                                        setOcDevice(
                                          (details as any).device || null,
                                        );

                                        setOcConfigStep(1);
                                        setForceConfig(true);
                                      }}
                                    />

                                    {/* Breakdown charts */}
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                      <CategoryDistribution
                                        classBreakdownData={classBreakdownData}
                                        totalObjectsCount={
                                          details.total_objects_count || 1
                                        }
                                      />
                                      <DemographicsSummary
                                        classifyGender={
                                          details.classify_gender ?? false
                                        }
                                        genderBreakdown={
                                          details.report_summary
                                            ?.gender_breakdown
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* Right Pane: Timeline & Line Crossing Breakdown */}
                                  <div className="space-y-6 lg:col-span-1">
                                    {details.report_summary
                                      ?.line_crossing_analytics && (
                                      <LineCrossingBreakdown
                                        classBreakdown={
                                          details.report_summary
                                            .line_crossing_analytics
                                            .class_breakdown
                                        }
                                      />
                                    )}
                                    <TimelineResults
                                      results={details.results}
                                      filepath={details.filepath}
                                      backendUrl={BACKEND_URL}
                                      onSeek={seekVideo}
                                      formatSeconds={formatSeconds}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              /* ── Case: Processing / Pending state ── */
                              <div className="flex animate-pulse flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628] p-8 text-center">
                                <Loader2 className="h-10 w-10 animate-spin text-[#60A5FA]" />
                                <h3 className="text-base font-semibold text-[#E8EDF5]">
                                  Tracking Analysis in Progress
                                </h3>
                                <p className="max-w-sm text-xs text-[#5A7A9A]">
                                  The background AI tracking worker is currently
                                  analyzing the media content. This dashboard
                                  will automatically refresh once the results
                                  are processed.
                                </p>
                                <div className="h-2 w-64 overflow-hidden rounded-full border border-[#1E3048]/60 bg-[#0A0F1E]">
                                  <div
                                    className="animate-progress h-full rounded-full bg-[#60A5FA]"
                                    style={{ width: '45%' }}
                                  />
                                </div>
                              </div>
                            )
                          ) : (
                            /* ── Case: Show Configuration Wizard steps ── */
                            <>
                              {ocConfigStep === 1 ? (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-[#E8EDF5]">
                                      AI Object Category Selection
                                    </h3>
                                    <span className="text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                                      Step 1 of 2: Select Categories
                                    </span>
                                  </div>
                                  <CocoCategorySelection
                                    selectedCustomClasses={
                                      ocSelectedCustomClasses
                                    }
                                    setSelectedCustomClasses={
                                      setOcSelectedCustomClasses
                                    }
                                    toggleCustomClass={toggleCustomClass}
                                    customSearchQuery={ocCustomSearchQuery}
                                    setCustomSearchQuery={
                                      setOcCustomSearchQuery
                                    }
                                  />
                                  <div className="flex justify-end pt-2">
                                    <button
                                      onClick={() => setOcConfigStep(3)}
                                      className="flex items-center gap-1.5 rounded-lg border border-[#1565C0] bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#1565C0]/90"
                                    >
                                      Next: Model Parameters
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ) : ocConfigStep ===
                                2 ? /* TrackerConfiguration presets temporarily skipped for testing
                                <div className="space-y-4 animate-in slide-in-from-right duration-250">
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => setOcConfigStep(1)}
                                      className="flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:underline"
                                    >
                                      <ArrowLeft className="h-3.5 w-3.5" />
                                      Back to categories
                                    </button>
                                    <span className="text-[10px] text-[#5A7A9A] uppercase tracking-wider font-bold">
                                      Step 2 of 3: Tracker Presets
                                    </span>
                                  </div>
                                  <TrackerConfiguration
                                    trackPeople={ocTrackPeople}
                                    setTrackPeople={setOcTrackPeople}
                                    classifyGender={ocClassifyGender}
                                    setClassifyGender={setOcClassifyGender}
                                    trackVehicles={ocTrackVehicles}
                                    setTrackVehicles={setOcTrackVehicles}
                                    classifyVehicle={ocClassifyVehicle}
                                    setClassifyVehicle={setOcClassifyVehicle}
                                    entryExitReport={ocEntryExitReport}
                                    setEntryExitReport={setOcEntryExitReport}
                                    lineCoords={ocLineCoords}
                                    setLineCoords={setOcLineCoords}
                                    setIsDrawingModalOpen={setOcIsDrawingModalOpen}
                                    trackCustom={ocTrackCustom}
                                    setTrackCustom={setOcTrackCustom}
                                    customSearchQuery={ocCustomSearchQuery}
                                    setCustomSearchQuery={setOcCustomSearchQuery}
                                    selectedCustomClasses={ocSelectedCustomClasses}
                                    toggleCustomClass={toggleCustomClass}
                                    filteredCocoClasses={filteredCocoClasses}
                                  />
                                  <div className="flex justify-end pt-2">
                                    <button
                                      onClick={() => setOcConfigStep(3)}
                                      className="flex items-center gap-1.5 rounded-lg border border-[#1565C0] bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1565C0]/90 transition-all shadow-md"
                                    >
                                      Next: Model Parameters
                                      <ArrowRight className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                */
                              null : (
                                <div className="animate-in slide-in-from-right space-y-4 duration-250">
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => setOcConfigStep(1)}
                                      className="flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:underline"
                                    >
                                      <ArrowLeft className="h-3.5 w-3.5" />
                                      Back to categories
                                    </button>
                                    <span className="text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                                      Step 2 of 2: Advanced parameters
                                    </span>
                                  </div>
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
                                        id: investigationMedia.id,
                                        status: 'pending',
                                      } as any
                                    }
                                    triggeringAnalysisId={
                                      runningAnalysis
                                        ? investigationMedia.id
                                        : null
                                    }
                                    handleTriggerAnalysis={
                                      handleTriggerAnalysis
                                    }
                                    trackPeople={ocTrackPeople}
                                    trackVehicles={ocTrackVehicles}
                                    trackCustom={ocTrackCustom}
                                    selectedCustomClasses={
                                      ocSelectedCustomClasses
                                    }
                                  />
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* ── PEOPLE ANALYTICS ── */}
                      {reportTab === 'people-analytics' && (
                        <div className="animate-in fade-in space-y-5 duration-200">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg border border-[#1E3048]/55 bg-[#0A0F1E] p-3 text-center">
                              <span className="block text-[10px] font-bold text-[#5A7A9A] uppercase">
                                Unique Visitors
                              </span>
                              <span className="mt-1 block text-lg font-bold text-[#E8EDF5]">
                                12
                              </span>
                            </div>
                            <div className="rounded-lg border border-[#1E3048]/55 bg-[#0A0F1E] p-3 text-center">
                              <span className="block text-[10px] font-bold text-[#5A7A9A] uppercase">
                                Staff Members
                              </span>
                              <span className="mt-1 block text-lg font-bold text-[#E8EDF5]">
                                4
                              </span>
                            </div>
                            <div className="rounded-lg border border-[#1E3048]/55 bg-[#0A0F1E] p-3 text-center">
                              <span className="block text-[10px] font-bold text-[#5A7A9A] uppercase">
                                Repeat Rate
                              </span>
                              <span className="mt-1 block text-lg font-bold text-[#E8EDF5]">
                                33.3%
                              </span>
                            </div>
                          </div>

                          {/* Dwell Stats */}
                          <div className="space-y-3 rounded-lg border border-[#1E3048]/60 bg-[#0A0F1E]/30 p-4 text-xs">
                            <h4 className="font-bold text-[#E8EDF5]">
                              Dwell Time Analytics
                            </h4>
                            <div className="flex justify-between">
                              <span className="text-[#5A7A9A]">
                                Average Dwell Time
                              </span>
                              <span className="font-semibold text-[#E8EDF5]">
                                8 mins 45 secs
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5A7A9A]">
                                Peak Visitor Occupancy
                              </span>
                              <span className="font-semibold text-[#E8EDF5]">
                                7 people
                              </span>
                            </div>
                          </div>

                          {/* Visitor log */}
                          <div className="space-y-3 rounded-lg border border-[#1E3048]/60 bg-[#0A0F1E]/30 p-4">
                            <h4 className="border-b border-[#1E3048]/40 pb-2 text-xs font-bold text-[#E8EDF5]">
                              Recent Visitors Log
                            </h4>
                            <div className="max-h-[160px] space-y-3 overflow-y-auto pr-1">
                              {[
                                {
                                  id: 'visitor_101',
                                  role: 'Visitor',
                                  dwell: '2m 14s',
                                  time: '00:23',
                                  repeat: 'No',
                                },
                                {
                                  id: 'Sarah Connor',
                                  role: 'Employee',
                                  dwell: '12m 40s',
                                  time: '01:05',
                                  repeat: 'Yes',
                                },
                                {
                                  id: 'visitor_103',
                                  role: 'Visitor',
                                  dwell: '4m 50s',
                                  time: '01:45',
                                  repeat: 'Yes',
                                },
                                {
                                  id: 'visitor_104',
                                  role: 'Visitor',
                                  dwell: '1m 15s',
                                  time: '02:22',
                                  repeat: 'No',
                                },
                              ].map((v, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between border-b border-[#1E3048]/20 pb-2 text-xs last:border-0 last:pb-0"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E3048] font-mono text-[9px] text-[#60A5FA]">
                                      {v.id[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-[#E8EDF5]">
                                        {v.id}
                                      </p>
                                      <p className="text-[9px] text-[#5A7A9A]">
                                        {v.role}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-mono text-[#E8EDF5]">
                                      {v.dwell}
                                    </p>
                                    <p className="text-[9px] text-[#5A7A9A]">
                                      Seen at {v.time}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── ACTIVITY DETECTION ── */}
                      {reportTab === 'activity-detection' && (
                        <div className="animate-in fade-in space-y-5 duration-200">
                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center">
                              <span className="block text-[10px] font-bold text-red-400 uppercase">
                                Critical
                              </span>
                              <span className="mt-1 block text-lg font-bold text-red-500">
                                2
                              </span>
                            </div>
                            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                              <span className="block text-[10px] font-bold text-amber-400 uppercase">
                                Warnings
                              </span>
                              <span className="mt-1 block text-lg font-bold text-amber-500">
                                3
                              </span>
                            </div>
                            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-center">
                              <span className="block text-[10px] font-bold text-blue-400 uppercase">
                                Info Logs
                              </span>
                              <span className="mt-1 block text-lg font-bold text-blue-500">
                                4
                              </span>
                            </div>
                          </div>

                          {/* Alerts Timeline */}
                          <div className="space-y-3 rounded-lg border border-[#1E3048]/60 bg-[#0A0F1E]/30 p-4">
                            <h4 className="border-b border-[#1E3048]/40 pb-2 text-xs font-bold text-[#E8EDF5]">
                              Safety & Intrusion Alerts
                            </h4>
                            <div className="max-h-[200px] space-y-3 overflow-y-auto pr-1">
                              {[
                                {
                                  time: '00:45',
                                  severity: 'critical',
                                  type: 'Human Fall',
                                  desc: 'Fall event detected in Lobby A',
                                },
                                {
                                  time: '01:20',
                                  severity: 'warning',
                                  type: 'Loitering',
                                  desc: 'Subject present in zone for > 25s',
                                },
                                {
                                  time: '02:05',
                                  severity: 'warning',
                                  type: 'Intrusion',
                                  desc: 'Movement in restricted vault',
                                },
                                {
                                  time: '02:40',
                                  severity: 'critical',
                                  type: 'Aggression',
                                  desc: 'Rapid velocity impact warning',
                                },
                                {
                                  time: '03:10',
                                  severity: 'info',
                                  type: 'Traversal',
                                  desc: 'Normal route walking movement log',
                                },
                              ].map((alert, i) => (
                                <div
                                  key={i}
                                  className="flex gap-2.5 border-b border-[#1E3048]/20 pb-2 text-xs last:border-0 last:pb-0"
                                >
                                  <div className="mt-0.5 shrink-0">
                                    <span
                                      className={cn(
                                        'block h-2 w-2 rounded-full',
                                        alert.severity === 'critical'
                                          ? 'bg-red-500'
                                          : alert.severity === 'warning'
                                            ? 'bg-amber-500'
                                            : 'bg-blue-500',
                                      )}
                                    />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={cn(
                                          'text-[9px] font-semibold tracking-wider uppercase',
                                          alert.severity === 'critical'
                                            ? 'text-red-400'
                                            : alert.severity === 'warning'
                                              ? 'text-amber-400'
                                              : 'text-blue-400',
                                        )}
                                      >
                                        {alert.type}
                                      </span>
                                      <span className="font-mono text-[9px] text-[#5A7A9A]">
                                        {alert.time}
                                      </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-[10px] text-[#5A7A9A]">
                                      {alert.desc}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="animate-in fade-in duration-200">
                      {/* ── OBJECT COUNT CONFIG ── */}
                      {/* ── OBJECT COUNT CONFIG ── */}
                      {reportTab === 'object-count' && (
                        <div className="animate-in fade-in duration-200">
                          {ocConfigStep === 1 ? (
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-[#E8EDF5]">
                                  AI Object Category Selection
                                </h3>
                                <span className="text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                                  Step 1 of 3: Select Categories
                                </span>
                              </div>
                              <CocoCategorySelection
                                selectedCustomClasses={ocSelectedCustomClasses}
                                setSelectedCustomClasses={
                                  setOcSelectedCustomClasses
                                }
                                toggleCustomClass={toggleCustomClass}
                                customSearchQuery={ocCustomSearchQuery}
                                setCustomSearchQuery={setOcCustomSearchQuery}
                              />
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => setOcConfigStep(2)}
                                  className="flex items-center gap-1.5 rounded-lg border border-[#1565C0] bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#1565C0]/90"
                                >
                                  Next: Tracker Presets
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : ocConfigStep === 2 ? (
                            <div className="animate-in slide-in-from-right space-y-4 duration-250">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setOcConfigStep(1)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:underline"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                  Back to categories
                                </button>
                                <span className="text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                                  Step 2 of 3: Tracker Presets
                                </span>
                              </div>
                              <TrackerConfiguration
                                trackPeople={ocTrackPeople}
                                setTrackPeople={setOcTrackPeople}
                                classifyGender={ocClassifyGender}
                                setClassifyGender={setOcClassifyGender}
                                trackVehicles={ocTrackVehicles}
                                setTrackVehicles={setOcTrackVehicles}
                                classifyVehicle={ocClassifyVehicle}
                                setClassifyVehicle={setOcClassifyVehicle}
                                entryExitReport={ocEntryExitReport}
                                setEntryExitReport={setOcEntryExitReport}
                                lineCoords={ocLineCoords}
                                setLineCoords={setOcLineCoords}
                                setIsDrawingModalOpen={setOcIsDrawingModalOpen}
                                trackCustom={ocTrackCustom}
                                setTrackCustom={setOcTrackCustom}
                                customSearchQuery={ocCustomSearchQuery}
                                setCustomSearchQuery={setOcCustomSearchQuery}
                                selectedCustomClasses={ocSelectedCustomClasses}
                                toggleCustomClass={toggleCustomClass}
                                filteredCocoClasses={filteredCocoClasses}
                              />
                              <div className="flex justify-end pt-2">
                                <button
                                  onClick={() => setOcConfigStep(3)}
                                  className="flex items-center gap-1.5 rounded-lg border border-[#1565C0] bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-md transition-all hover:bg-[#1565C0]/90"
                                >
                                  Next: Model Parameters
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="animate-in slide-in-from-right space-y-4 duration-250">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => setOcConfigStep(2)}
                                  className="flex items-center gap-1.5 text-xs font-semibold text-[#60A5FA] hover:underline"
                                >
                                  <ArrowLeft className="h-3.5 w-3.5" />
                                  Back to presets configuration
                                </button>
                                <span className="text-[10px] font-bold tracking-wider text-[#5A7A9A] uppercase">
                                  Step 3 of 3: Advanced parameters
                                </span>
                              </div>
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
                                    id: investigationMedia.id,
                                    status: 'pending',
                                  } as any
                                }
                                triggeringAnalysisId={
                                  runningAnalysis ? investigationMedia.id : null
                                }
                                handleTriggerAnalysis={handleTriggerAnalysis}
                                trackPeople={ocTrackPeople}
                                trackVehicles={ocTrackVehicles}
                                trackCustom={ocTrackCustom}
                                selectedCustomClasses={ocSelectedCustomClasses}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── PEOPLE ANALYTICS CONFIG ── */}
                      {reportTab === 'people-analytics' && (
                        <PeopleConfigureTab />
                      )}

                      {/* ── ACTIVITY DETECTION CONFIG ── */}
                      {reportTab === 'activity-detection' && (
                        <ActivityConfigureTab />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reusable Entry/Exit Crossing Gate Drawer Modal */}
        {ocIsDrawingModalOpen && (
          <DrawingModal
            initialCoords={ocLineCoords}
            onClose={() => {
              setOcIsDrawingModalOpen(false);
            }}
            mediaUrl={`${BACKEND_URL}/${investigationMedia.filepath}`}
            mediaType={investigationMedia.mediaType || 'video'}
            onSave={(coords) => {
              setOcLineCoords(coords);
            }}
          />
        )}
      </>
    );
  }

  // ── Welcome / Guide View (if no media is selected) ────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-[#E8EDF5]">
          New Investigation
        </h1>
        <p className="mx-auto max-w-md text-sm text-[#5A7A9A]">
          Analyze CCTV video files and photos to discover object counts, gate
          statistics, and pose warning logs.
        </p>
      </div>

      {/* Main CTA Card */}
      <div className="flex flex-col items-center space-y-6 rounded-2xl border border-[#1E3048] bg-[#0D1628] p-8 text-center shadow-xl">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0A0F1E] shadow-inner">
          <Folder className="h-8 w-8 text-[#60A5FA]" />
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
            !
          </span>
        </div>

        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-bold text-[#E8EDF5]">
            No Investigation Media Selected
          </h3>
          <p className="text-xs leading-relaxed text-[#5A7A9A]">
            To begin an investigation, please choose a video or photo from your
            Media Gallery. If you haven&apos;t uploaded any files yet, you can
            upload them there.
          </p>
        </div>

        <Link
          href="/services/gallery"
          className="inline-flex items-center gap-2 rounded-xl bg-[#1565C0] px-6 py-3 text-xs font-semibold text-white shadow-lg shadow-[#1565C0]/20 transition-all hover:bg-[#1565C0]/90"
        >
          <Folder className="h-4 w-4" />
          Go to Media Gallery
        </Link>
      </div>

      {/* Steps Guide Grid */}
      <div className="grid w-full grid-cols-1 gap-4 pt-4 md:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-[#1E3048]/50 bg-[#0D1628]/60 p-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#60A5FA]/10 font-mono text-xs font-bold text-[#60A5FA]">
            01
          </div>
          <h4 className="text-xs font-bold text-[#E8EDF5]">Upload Media</h4>
          <p className="text-[10px] leading-relaxed text-[#5A7A9A]">
            Go to the Centralized Media Gallery and upload your CCTV video files
            or photo assets.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-[#1E3048]/50 bg-[#0D1628]/60 p-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#10B981]/10 font-mono text-xs font-bold text-[#10B981]">
            02
          </div>
          <h4 className="text-xs font-bold text-[#E8EDF5]">Select & Launch</h4>
          <p className="text-[10px] leading-relaxed text-[#5A7A9A]">
            Select the uploaded file in the gallery grid and click &quot;Start
            Investigation&quot; in the sidebar.
          </p>
        </div>
        <div className="space-y-2 rounded-xl border border-[#1E3048]/50 bg-[#0D1628]/60 p-5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F59E0B]/10 font-mono text-xs font-bold text-[#F59E0B]">
            03
          </div>
          <h4 className="text-xs font-bold text-[#E8EDF5]">Analyze Reports</h4>
          <p className="text-[10px] leading-relaxed text-[#5A7A9A]">
            Review the combined static counting metrics, repeat visitor logs,
            and safety activity warning alerts.
          </p>
        </div>
      </div>
    </div>
  );
}

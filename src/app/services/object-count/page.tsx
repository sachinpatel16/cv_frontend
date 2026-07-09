'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Users,
  ImageIcon,
  Video,
  Trash2,
  Loader2,
  RotateCcw,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Settings2,
  ChevronLeft,
  ChevronRight,
  History,
  Tv,
  Car,
  Layers,
  Search,
  Sliders,
  Sparkles,
  Play,
  Calendar,
  Activity,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  uploadObjectCountMedia,
  listObjectCountMedia,
  getObjectCountMediaDetails,
  deleteObjectCountMedia,
  triggerObjectAnalysis,
} from '@/lib/api/objectcount';
import { ApiError } from '@/types/api';
import type {
  ObjectCountMedia,
  ObjectCountMediaDetails,
  ObjectTrackResult,
} from '@/types/objectcount';
import { COCO_CLASSES } from '@/lib/services';
import TrackerConfiguration from './components/TrackerConfiguration';
import AdvancedConfiguration from './components/AdvancedConfiguration';
import DrawingModal from './components/DrawingModal';
import AnalyticsCards from './components/AnalyticsCards';
import EntryExitSummary from './components/EntryExitSummary';
import VideoPreviewHUD from './components/VideoPreviewHUD';
import CategoryDistribution from './components/CategoryDistribution';
import DemographicsSummary from './components/DemographicsSummary';
import LineCrossingBreakdown from './components/LineCrossingBreakdown';
import TimelineResults from './components/TimelineResults';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'library' | 'search' | 'results';

// ── Status badge ──
function StatusBadge({
  status,
  progress,
}: {
  status: string;
  progress?: number | null;
}) {
  const map: Record<string, { color: string; icon: React.ElementType }> = {
    completed: {
      color: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle2,
    },
    pending: { color: 'text-[#F59E0B] bg-[#F59E0B]/10', icon: Clock },
    processing: { color: 'text-[#60A5FA] bg-[#60A5FA]/10', icon: Loader2 },
    failed: { color: 'text-red-400 bg-red-400/10', icon: AlertCircle },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${s.color}`}
    >
      <Icon
        className={cn('h-3 w-3', status === 'processing' && 'animate-spin')}
      />
      {status === 'processing' && progress !== undefined && progress !== null
        ? `${status} (${progress}%)`
        : status}
    </span>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function ObjectCountPage() {
  const [tab, setTab] = useState<Tab>('library');

  // History Drawer state
  const [historyOpen, setHistoryOpen] = useState(false);

  // Media Library state
  const [media, setMedia] = useState<ObjectCountMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload configuration state
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('video');

  // Analysis target configuration state
  const [trackPeople, setTrackPeople] = useState(true);
  const [classifyGender, setClassifyGender] = useState(false);
  const [trackVehicles, setTrackVehicles] = useState(true);
  const [classifyVehicle, setClassifyVehicle] = useState(true);
  const [trackCustom, setTrackCustom] = useState(false);
  const [selectedCustomClasses, setSelectedCustomClasses] = useState<string[]>(
    [],
  );
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  // Threshold / configuration settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);
  const [minTrackFrames, setMinTrackFrames] = useState(10);
  const [trackBuffer, setTrackBuffer] = useState(30);

  // GMC, Re-ID, and YOLO image size settings
  const [gmcMethod, setGmcMethod] = useState<string>('none');
  const [imgsz, setImgsz] = useState<number>(480);
  const [reidClasses, setReidClasses] = useState<string[]>(['person']);
  const [device, setDevice] = useState<string | null>(null);

  // Helper to compute active classes being tracked
  const getActiveClassesToTrack = useCallback((): string[] => {
    let classes: string[] = [];
    if (trackCustom) {
      classes = [...selectedCustomClasses];
      if (trackPeople && !classes.includes('person')) {
        classes.push('person');
      }
      if (trackVehicles) {
        const vClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
        vClasses.forEach((vc) => {
          if (!classes.includes(vc)) {
            classes.push(vc);
          }
        });
      }
    } else {
      if (trackPeople) {
        classes.push('person');
      }
      if (trackVehicles) {
        classes.push('car', 'truck', 'bus', 'motorcycle', 'bicycle');
      }
    }
    return classes;
  }, [trackCustom, selectedCustomClasses, trackPeople, trackVehicles]);

  const availableReidClasses =
    getActiveClassesToTrack().length > 0
      ? getActiveClassesToTrack()
      : ['person', 'car', 'bus', 'truck', 'motorcycle', 'bicycle'];

  // Entry/Exit crossing report configuration
  const [entryExitReport, setEntryExitReport] = useState(false);
  const [lineCoords, setLineCoords] = useState<number[][] | null>(null);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [videoResolution, setVideoResolution] = useState<{
    width: number;
    height: number;
  }>({ width: 1280, height: 720 });

  // Analysis trigger progress
  const [triggeringAnalysisId, setTriggeringAnalysisId] = useState<
    string | null
  >(null);

  // Details view state
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [details, setDetails] = useState<ObjectCountMediaDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastLoadedMediaIdRef = useRef<string | null>(null);

  // Sync configs when details changes
  useEffect(() => {
    if (!details) {
      lastLoadedMediaIdRef.current = null;
      return;
    }
    if (details.id === lastLoadedMediaIdRef.current) return;

    lastLoadedMediaIdRef.current = details.id;

    setTrackPeople(
      details.classes_to_track
        ? details.classes_to_track.includes('person')
        : true,
    );
    setClassifyGender(details.classify_gender ?? false);
    setTrackVehicles(
      details.classes_to_track
        ? details.classes_to_track.some((c) =>
            ['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(c),
          )
        : true,
    );
    setClassifyVehicle(details.classify_vehicle ?? true);

    const hasCustom =
      !!details.classes_to_track &&
      details.classes_to_track.some(
        (c) =>
          c !== 'person' &&
          !['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(c),
      );
    setTrackCustom(hasCustom);

    setSelectedCustomClasses(
      details.classes_to_track
        ? details.classes_to_track.filter(
            (c) =>
              c !== 'person' &&
              !['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(c),
          )
        : [],
    );
    setEntryExitReport(!!details.entry_exit_report);
    setLineCoords(details.line_coords || null);
    setDevice((details as any).device || null);
    setImgsz((details as any).imgsz || 480);
  }, [details]);

  // Fetch all media
  const fetchMedia = useCallback(async (showLoading = true) => {
    if (showLoading) {
      Promise.resolve().then(() => setMediaLoading(true));
    }
    try {
      const res = await listObjectCountMedia();
      setMedia(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      }
    } finally {
      setMediaLoading(false);
    }
  }, []);

  // Poll media list while items are processing
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchMedia(true);
    });
  }, [fetchMedia]);

  useEffect(() => {
    const hasProcessing = media.some(
      (m) => m.status === 'processing' || m.status === 'pending',
    );
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchMedia(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [media, fetchMedia]);

  // Load specific media details
  const fetchDetails = useCallback(async (id: string) => {
    Promise.resolve().then(() => setDetailsLoading(true));
    try {
      const res = await getObjectCountMediaDetails(id);
      setDetails(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      }
      setTab('library');
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  // Poll details for selected media if it's processing
  useEffect(() => {
    if (!selectedMediaId) return;
    if (tab === 'library') return;

    Promise.resolve().then(() => {
      fetchDetails(selectedMediaId);
    });
  }, [selectedMediaId, tab, fetchDetails]);

  useEffect(() => {
    if (!details || !selectedMediaId) return;
    if (details.status !== 'processing' && details.status !== 'pending') return;

    const interval = setInterval(() => {
      getObjectCountMediaDetails(selectedMediaId)
        .then((res) => {
          setDetails(res.data);
          // If complete, also refresh listing background
          if (res.data.status === 'completed' || res.data.status === 'failed') {
            fetchMedia(false);
          }
        })
        .catch(() => {});
    }, 5000);

    return () => clearInterval(interval);
  }, [details, selectedMediaId, fetchMedia]);

  // Handle media upload
  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        const res = await uploadObjectCountMedia(files, mediaType);
        fetchMedia(false);
        if (res.data && res.data.length > 0) {
          const newlyUploaded = res.data[0];
          setSelectedMediaId(newlyUploaded.id);
          toast.success(
            `Uploaded successfully. Navigating to configure tracking.`,
          );
          if (
            newlyUploaded.status === 'processing' ||
            newlyUploaded.status === 'completed'
          ) {
            setTab('results');
          } else {
            setTab('search');
          }
        } else {
          toast.success(
            `Uploaded ${res.data.length} file(s). Select a file to configure analysis.`,
          );
        }
      } catch (err) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else {
          toast.error('Upload failed');
        }
      } finally {
        setUploading(false);
      }
    },
    [mediaType, fetchMedia],
  );

  // Trigger Object Count analysis run
  const handleTriggerAnalysis = async (mediaId: string) => {
    setTriggeringAnalysisId(mediaId);

    // Build the classes_to_track array
    let classesToTrack: string[] | null = [];

    if (trackCustom) {
      // If Custom tracking is enabled
      if (selectedCustomClasses.length === 0) {
        // Fallback or if they selected all
        classesToTrack = null;
      } else {
        classesToTrack = [...selectedCustomClasses];
        // Ensure people classes are included if people is checked
        if (trackPeople && !classesToTrack.includes('person')) {
          classesToTrack.push('person');
        }
        // Ensure vehicle classes are included if vehicles checked
        if (trackVehicles) {
          const vClasses = ['car', 'truck', 'bus', 'motorcycle', 'bicycle'];
          vClasses.forEach((vc) => {
            if (!classesToTrack?.includes(vc)) {
              classesToTrack?.push(vc);
            }
          });
        }
      }
    } else {
      // Direct preset tracking
      if (trackPeople) {
        classesToTrack.push('person');
      }
      if (trackVehicles) {
        classesToTrack.push('car', 'truck', 'bus', 'motorcycle', 'bicycle');
      }

      // If nothing is selected, default to tracking everything (null)
      if (classesToTrack.length === 0) {
        classesToTrack = null;
      }
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
      device: device,
    };

    try {
      const res = await triggerObjectAnalysis(mediaId, config);
      toast.success('Object tracking analysis triggered successfully!');
      // Update local listing state
      setMedia((prev) =>
        prev.map((item) => (item.id === mediaId ? res.data : item)),
      );
      // If currently looking at this item, update details
      if (selectedMediaId === mediaId) {
        setDetails((prev) => (prev ? { ...prev, ...res.data } : null));
      }
      setTab('results');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to trigger analysis');
      }
    } finally {
      setTriggeringAnalysisId(null);
    }
  };

  // Handle single deletion
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteObjectCountMedia(id);
      toast.success('Media record deleted');
      setMedia((prev) => prev.filter((m) => m.id !== id));
      if (selectedMediaId === id) {
        setSelectedMediaId(null);
        setDetails(null);
        setTab('library');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Delete failed');
      }
    }
  };

  // Video seeking helper
  const seekVideo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  const formatSeconds = (sec: number | null): string => {
    if (sec === null) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Dropzone config
  const onDrop = useCallback(
    (accepted: File[]) => {
      handleUpload(accepted);
    },
    [handleUpload],
  );

  const accept: Record<string, string[]> =
    mediaType === 'photo'
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }
      : { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    disabled: uploading,
  });

  // Filter custom COCO classes based on query
  const filteredCocoClasses = COCO_CLASSES.filter(
    (c) =>
      c.toLowerCase().includes(customSearchQuery.toLowerCase()) &&
      c !== 'person' &&
      !['car', 'truck', 'bus', 'motorcycle', 'bicycle'].includes(c),
  );

  const toggleCustomClass = (c: string) => {
    setSelectedCustomClasses((prev) =>
      prev.includes(c) ? prev.filter((item) => item !== c) : [...prev, c],
    );
  };

  // Format Recharts data
  const classBreakdownData = details?.report_summary?.unique_counts
    ? Object.entries(details.report_summary.unique_counts)
        .map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          count,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  const handleSelectMedia = (item: ObjectCountMedia) => {
    setSelectedMediaId(item.id);
    if (item.status === 'processing' || item.status === 'completed') {
      setTab('results');
    } else {
      setTab('search');
    }
    setHistoryOpen(false);
  };

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            Generic Object Count & Tracking
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            YOLO + BoT-SORT background analysis dashboard for custom object
            tracking, concurrency reports, and demographic metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setHistoryOpen(!historyOpen);
              fetchMedia(false);
            }}
            className="relative flex shrink-0 items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <History className="h-3.5 w-3.5" />
            History
            {media.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1565C0] text-[9px] font-bold text-white">
                {media.length > 99 ? '99+' : media.length}
              </span>
            )}
          </button>

          {tab !== 'library' && (
            <button
              onClick={() => {
                setTab('library');
                setSelectedMediaId(null);
                setDetails(null);
              }}
              className="flex items-center gap-1.5 rounded-md border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-xs font-medium text-[#E8EDF5] transition-colors hover:bg-[#1E3048]"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Library
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {[
          { id: 'library', label: 'Media Library', icon: ImageIcon },
          { id: 'search', label: 'Search', icon: Search },
          { id: 'results', label: 'Results', icon: CheckCircle2 },
        ].map(({ id, label, icon: Icon }) => {
          const isDisabled =
            (id === 'search' || id === 'results') &&
            !selectedMediaId &&
            media.length === 0;

          return (
            <button
              key={id}
              onClick={() => {
                if (isDisabled) {
                  toast.error(
                    'Select a media item from the library first to configure or view tracking results.',
                  );
                  return;
                }

                // If user clicks on search or results without a selected media item,
                // automatically select the first media item in the list if available.
                if (
                  (id === 'search' || id === 'results') &&
                  !selectedMediaId &&
                  media.length > 0
                ) {
                  const defaultMedia = media[0];
                  setSelectedMediaId(defaultMedia.id);
                }

                setTab(id as Tab);
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                tab === id
                  ? 'bg-[#1565C0] text-white'
                  : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
                isDisabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* ════════ Tab: Library View ════════ */}
      {tab === 'library' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Upload form / Dropzone */}
            <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-[#E8EDF5]">
                    Upload Media Files
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5A7A9A]">
                    Upload your raw footage first, then select configuration
                    presets below to trigger tracking.
                  </p>
                </div>
                <div className="flex rounded-md border border-[#1E3048]">
                  {(['photo', 'video'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMediaType(t)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                        mediaType === t
                          ? 'bg-[#1565C0] text-white'
                          : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                        t === 'photo' ? 'rounded-l-md' : 'rounded-r-md',
                      )}
                    >
                      {t === 'photo' ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <Video className="h-3 w-3" />
                      )}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
                  uploading && 'pointer-events-none opacity-50',
                  isDragActive
                    ? 'border-[#1565C0] bg-[#1565C0]/10'
                    : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
                )}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-[#60A5FA]" />
                ) : (
                  <Upload
                    className={cn(
                      'h-8 w-8',
                      isDragActive ? 'text-[#60A5FA]' : 'text-[#5A7A9A]',
                    )}
                  />
                )}
                <p className="text-center text-sm text-[#5A7A9A]">
                  {uploading
                    ? 'Uploading media files to storage...'
                    : `Drop ${mediaType === 'photo' ? 'photos' : 'videos'} here or click to browse files`}
                </p>
              </div>
            </div>
          </div>

          {/* Media Grid */}
          <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
            <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3.5">
              <div>
                <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                  Media Library ({media.length})
                </h3>
                <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                  Select a media item to configure custom COCO targets and
                  trigger background models.
                </p>
              </div>
              <button
                onClick={() => fetchMedia(true)}
                className="rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                title="Refresh Library"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>

            {mediaLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
              </div>
            ) : media.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-1.5">
                <p className="text-sm text-[#5A7A9A]">
                  No media files uploaded yet.
                </p>
                <p className="text-xs text-[#5A7A9A]/60">
                  Upload a photo or video above to start analyzing custom
                  objects.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {media.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedMediaId(item.id);
                      if (
                        item.status === 'processing' ||
                        item.status === 'completed'
                      ) {
                        setTab('results');
                      } else {
                        setTab('search');
                      }
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E] transition-all hover:border-[#1565C0]/60 hover:shadow-md"
                  >
                    {item.media_type === 'photo' ? (
                      <div className="relative aspect-video w-full bg-[#1E3048]/30">
                        <Image
                          src={`${BACKEND_URL}/${item.filepath}`}
                          alt={item.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, 25vw"
                        />
                      </div>
                    ) : (
                      <div className="relative aspect-video w-full overflow-hidden bg-[#1E3048]/20">
                        <video
                          src={`${BACKEND_URL}/${item.filepath}#t=0.1`}
                          preload="metadata"
                          muted
                          playsInline
                          className="pointer-events-none h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 p-3">
                      <p
                        className="truncate text-xs font-semibold text-[#E8EDF5] group-hover:text-[#60A5FA]"
                        title={item.filename}
                      >
                        {item.filename}
                      </p>
                      <div className="flex items-center justify-between">
                        <StatusBadge
                          status={item.status}
                          progress={item.progress_percentage}
                        />
                        <button
                          onClick={(e) => handleDelete(item.id, e)}
                          className="rounded p-1 text-[#5A7A9A] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-400/15 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ Tab: Search (Configuration) View ════════ */}
      {tab === 'search' && (
        <div className="space-y-6">
          {detailsLoading && !details ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : details ? (
            <>
              {/* Media Info Dashboard Bar */}
              <div className="flex flex-col gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#E8EDF5]">
                    {details.filename}
                    <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-normal text-[#5A7A9A] uppercase">
                      {details.media_type}
                    </span>
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5A7A9A]">
                    <Calendar className="h-3.5 w-3.5" />
                    Uploaded on {new Date(
                      details.created_at,
                    ).toLocaleString()}{' '}
                    · ID: {details.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={details.status}
                    progress={details.progress_percentage}
                  />
                  <button
                    onClick={(e) => handleDelete(details.id, e)}
                    className="flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Media
                  </button>
                </div>
              </div>

              {/* AI Tracking Configuration */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TrackerConfiguration
                  trackPeople={trackPeople}
                  setTrackPeople={setTrackPeople}
                  classifyGender={classifyGender}
                  setClassifyGender={setClassifyGender}
                  trackVehicles={trackVehicles}
                  setTrackVehicles={setTrackVehicles}
                  classifyVehicle={classifyVehicle}
                  setClassifyVehicle={setClassifyVehicle}
                  entryExitReport={entryExitReport}
                  setEntryExitReport={setEntryExitReport}
                  lineCoords={lineCoords}
                  setLineCoords={setLineCoords}
                  setIsDrawingModalOpen={setIsDrawingModalOpen}
                  trackCustom={trackCustom}
                  setTrackCustom={setTrackCustom}
                  customSearchQuery={customSearchQuery}
                  setCustomSearchQuery={setCustomSearchQuery}
                  selectedCustomClasses={selectedCustomClasses}
                  toggleCustomClass={toggleCustomClass}
                  filteredCocoClasses={filteredCocoClasses}
                  confidenceThreshold={confidenceThreshold}
                  setConfidenceThreshold={setConfidenceThreshold}
                  minTrackFrames={minTrackFrames}
                  setMinTrackFrames={setMinTrackFrames}
                  trackBuffer={trackBuffer}
                  setTrackBuffer={setTrackBuffer}
                  gmcMethod={gmcMethod}
                  setGmcMethod={setGmcMethod}
                  imgsz={imgsz}
                  setImgsz={setImgsz}
                  device={device}
                  setDevice={setDevice}
                  availableReidClasses={availableReidClasses}
                  reidClasses={reidClasses}
                  setReidClasses={setReidClasses}
                  details={details}
                  triggeringAnalysisId={triggeringAnalysisId}
                  handleTriggerAnalysis={handleTriggerAnalysis}
                />
                <AdvancedConfiguration
                  confidenceThreshold={confidenceThreshold}
                  setConfidenceThreshold={setConfidenceThreshold}
                  minTrackFrames={minTrackFrames}
                  setMinTrackFrames={setMinTrackFrames}
                  trackBuffer={trackBuffer}
                  setTrackBuffer={setTrackBuffer}
                  gmcMethod={gmcMethod}
                  setGmcMethod={setGmcMethod}
                  imgsz={imgsz}
                  setImgsz={setImgsz}
                  device={device}
                  setDevice={setDevice}
                  availableReidClasses={availableReidClasses}
                  reidClasses={reidClasses}
                  setReidClasses={setReidClasses}
                  details={details}
                  triggeringAnalysisId={triggeringAnalysisId}
                  handleTriggerAnalysis={handleTriggerAnalysis}
                  trackPeople={trackPeople}
                  trackVehicles={trackVehicles}
                  trackCustom={trackCustom}
                  selectedCustomClasses={selectedCustomClasses}
                />
              </div>
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <p className="text-sm text-[#5A7A9A]">
                Select a media item from the library first to configure
                tracking.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ════════ Tab: Results View ════════ */}
      {tab === 'results' && (
        <div className="space-y-6">
          {detailsLoading && !details ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : details ? (
            <>
              {/* Media Info Dashboard Bar */}
              <div className="flex flex-col gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-[#E8EDF5]">
                    {details.filename}
                    <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-normal text-[#5A7A9A] uppercase">
                      {details.media_type}
                    </span>
                  </h2>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5A7A9A]">
                    <Calendar className="h-3.5 w-3.5" />
                    Uploaded on {new Date(
                      details.created_at,
                    ).toLocaleString()}{' '}
                    · ID: {details.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={details.status}
                    progress={details.progress_percentage}
                  />
                  <button
                    onClick={(e) => handleDelete(details.id, e)}
                    className="flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Media
                  </button>
                </div>
              </div>

              {/* Conditional render based on state */}
              {/* ── Case 1: Pending (unconfigured/not queued) or Failed prompt ── */}
              {details.status === 'failed' ||
              (details.status === 'pending' &&
                details.classes_to_track === null &&
                triggeringAnalysisId !== details.id) ? (
                <div className="flex h-96 flex-col items-center justify-center space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center shadow-lg">
                  <div className="relative flex items-center justify-center">
                    <Settings2 className="h-12 w-12 text-[#5A7A9A]" />
                  </div>
                  <div className="flex max-w-md flex-col items-center space-y-2">
                    <h3 className="text-base font-semibold text-[#E8EDF5]">
                      No Tracking Results Yet
                    </h3>
                    <p className="text-xs leading-relaxed text-[#5A7A9A]">
                      {details.status === 'failed'
                        ? 'The previous tracker run failed. Please configure tracking presets and try running the analysis again.'
                        : 'This media item has not been analyzed yet. Please configure the tracking parameters first.'}
                    </p>
                    <button
                      onClick={() => setTab('search')}
                      className="mt-2 flex items-center gap-1.5 rounded-md bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
                    >
                      <Search className="h-4 w-4" />
                      Configure & Run Tracker
                    </button>
                  </div>
                </div>
              ) : details.status === 'processing' ||
                (details.status === 'pending' &&
                  (triggeringAnalysisId === details.id ||
                    details.classes_to_track !== null)) ? (
                /* ── Case 2: Processing State UI / Loader ── */
                <div className="flex h-96 flex-col items-center justify-center space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center shadow-lg">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-[#1565C0]" />
                    <Sparkles className="absolute h-5 w-5 text-[#60A5FA]" />
                  </div>
                  <div className="flex max-w-md flex-col items-center space-y-2">
                    <h3 className="text-base font-semibold text-[#E8EDF5]">
                      Analyzing Media File...
                    </h3>
                    <p className="text-xs leading-relaxed text-[#5A7A9A]">
                      YOLO is running frame detections while the BoT-SORT
                      tracker builds historical object trajectories. If enabled,
                      InsightFace is mapping demographic attributes.
                    </p>

                    {/* Progress Bar */}
                    <div className="flex w-full flex-col items-center space-y-2 pt-2">
                      <div className="h-2.5 w-64 overflow-hidden rounded-full border border-[#1E3048] bg-[#0A0F1E]">
                        <div
                          className="h-full rounded-full bg-[#1565C0] transition-all duration-500"
                          style={{
                            width: `${details.progress_percentage ?? 0}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs font-bold text-[#60A5FA]">
                        {details.progress_percentage !== undefined &&
                        details.progress_percentage !== null
                          ? `Progress: ${details.progress_percentage}%`
                          : 'Starting analysis...'}
                      </p>
                    </div>

                    {details.classify_gender && (
                      <div className="mt-3 flex max-w-sm items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-left text-[11px] leading-normal text-amber-400/90">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <span>
                          <strong>Demographics Active:</strong> Gender
                          classification (InsightFace) is enabled. Extracting
                          head crops and running demographics classification is
                          a heavy task and will take more time.
                        </span>
                      </div>
                    )}

                    <p className="mt-4 animate-pulse text-[10px] text-[#5A7A9A]/60">
                      This page will auto-refresh once results are processed by
                      the worker.
                    </p>
                  </div>
                </div>
              ) : details.status === 'completed' ? (
                /* ── Case 3: Completed State Report ── */
                <div className="space-y-6">
                  <AnalyticsCards
                    totalUniqueTracked={details.total_objects_count}
                    peakConcurrency={details.peak_objects_count}
                    avgConcurrency={details.average_objects_count}
                    videoDurationSeconds={details.video_duration_seconds}
                  />

                  {details.report_summary?.line_crossing_analytics && (
                    <EntryExitSummary
                      totalEntries={
                        details.report_summary.line_crossing_analytics
                          .total_entries
                      }
                      totalExits={
                        details.report_summary.line_crossing_analytics
                          .total_exits
                      }
                    />
                  )}

                  {/* Main Analysis Pane */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Pane: Media Player & Breakdown Charts */}
                    <div className="space-y-6 lg:col-span-2">
                      <VideoPreviewHUD
                        processedFilepath={details.processed_filepath}
                        mediaType={details.media_type}
                        filepath={details.filepath}
                        backendUrl={BACKEND_URL}
                        videoRef={videoRef}
                        onReconfigure={() => {
                          // Reset state variables to match currently selected media details
                          setTrackPeople(
                            details.classes_to_track
                              ? details.classes_to_track.includes('person')
                              : true,
                          );
                          setClassifyGender(details.classify_gender);
                          setTrackVehicles(
                            details.classes_to_track
                              ? details.classes_to_track.some((c) =>
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
                          setClassifyVehicle(details.classify_vehicle);
                          setTrackCustom(
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
                              ),
                          );
                          setSelectedCustomClasses(
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
                          setEntryExitReport(!!details.entry_exit_report);
                          setLineCoords(details.line_coords || null);
                          setGmcMethod('none');
                          setImgsz(480);
                          setReidClasses(['person']);

                          // Switch to search tab to re-configure
                          setTab('search');
                        }}
                      />

                      {/* Breakdown charts */}
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <CategoryDistribution
                          classBreakdownData={classBreakdownData}
                          totalObjectsCount={details.total_objects_count || 1}
                        />

                        <DemographicsSummary
                          classifyGender={details.classify_gender}
                          genderBreakdown={
                            details.report_summary?.gender_breakdown
                          }
                        />

                        {/* Line Crossing Class Breakdown Table */}
                        {details.report_summary?.line_crossing_analytics && (
                          <LineCrossingBreakdown
                            classBreakdown={
                              details.report_summary.line_crossing_analytics
                                .class_breakdown
                            }
                          />
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Tracking Timelines list */}
                    <TimelineResults
                      results={details.results}
                      filepath={details.filepath}
                      backendUrl={BACKEND_URL}
                      onSeek={seekVideo}
                      formatSeconds={formatSeconds}
                    />
                  </div>
                </div>
              ) : (
                /* ── Case 4: Default fallback prompt if status isn't matched ── */
                <div className="flex h-96 flex-col items-center justify-center space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center shadow-lg">
                  <div className="relative flex items-center justify-center">
                    <AlertCircle className="h-12 w-12 text-[#5A7A9A]" />
                  </div>
                  <div className="flex max-w-md flex-col items-center space-y-2">
                    <h3 className="text-base font-semibold text-[#E8EDF5]">
                      Tracking Status: {details.status}
                    </h3>
                    <p className="text-xs leading-relaxed text-[#5A7A9A]">
                      Status is currently &quot;{details.status}&quot;. Select
                      details to configure, run, or wait for active analysis
                      processing.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <p className="text-sm text-[#5A7A9A]">
                Select a media item from the library first to view details and
                results.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Visual Line Drawing Modal */}
      {isDrawingModalOpen && details && (
        <DrawingModal
          initialCoords={lineCoords}
          onClose={() => {
            setIsDrawingModalOpen(false);
          }}
          mediaUrl={`${BACKEND_URL}/${details.filepath}`}
          mediaType={details.media_type}
          onSave={(coords) => {
            setLineCoords(coords);
          }}
        />
      )}

      {/* History Drawer */}
      <HistoryDrawer
        open={historyOpen}
        media={media}
        loading={mediaLoading}
        onClose={() => setHistoryOpen(false)}
        onRefresh={() => fetchMedia(true)}
        onSelectMedia={handleSelectMedia}
        title="Analysis History"
      />
    </div>
  );
}

interface HistoryDrawerProps {
  open: boolean;
  media: ObjectCountMedia[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelectMedia: (item: ObjectCountMedia) => void;
  title: string;
}

function HistoryDrawer({
  open,
  media,
  loading,
  onClose,
  onRefresh,
  onSelectMedia,
  title,
}: HistoryDrawerProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <History className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">{title}</p>
              <p className="text-[10px] text-[#5A7A9A]">
                {media.length} item{media.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
              title="Refresh"
            >
              <RotateCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : media.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
                <History className="h-6 w-6 text-[#5A7A9A]/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#E8EDF5]">
                  No history yet
                </p>
                <p className="mt-0.5 text-xs text-[#5A7A9A]">
                  Upload and process media to create your first session.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {media.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelectMedia(item)}
                  className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1E3048]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E3048] bg-[#0D1628] transition-colors group-hover:border-[#1565C0]/50">
                    {item.media_type === 'photo' ? (
                      <ImageIcon className="h-5 w-5 text-[#5A7A9A]" />
                    ) : (
                      <Video className="h-5 w-5 text-[#5A7A9A]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                        {item.filename}
                      </p>
                      <StatusBadge
                        status={item.status}
                        progress={item.progress_percentage}
                      />
                    </div>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {formatDate(item.created_at)}
                    </p>
                    {item.status === 'completed' &&
                      item.total_objects_count !== null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#1565C0]/10 px-2 py-0.5">
                          <Layers className="h-3 w-3 text-[#60A5FA]" />
                          <span className="text-[10px] font-semibold text-[#60A5FA]">
                            {item.total_objects_count} objects
                          </span>
                        </span>
                      )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#60A5FA]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E3048] px-5 py-3">
          <p className="text-center text-[10px] text-[#5A7A9A]">
            Click any item to load its results
          </p>
        </div>
      </div>
    </>
  );
}

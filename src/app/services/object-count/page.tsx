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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Column: Form Settings */}
                <div className="space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-2">
                  <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3">
                    <Settings2 className="h-5 w-5 text-[#1565C0]" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#E8EDF5]">
                        AI Tracking Configuration
                      </h3>
                      <p className="text-[11px] text-[#5A7A9A]">
                        Configure tracking parameters and models before firing
                        the background task.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Presets Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Preset: People */}
                      <div
                        className={cn(
                          'cursor-pointer rounded-lg border p-4 transition-colors',
                          trackPeople
                            ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                            : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
                        )}
                        onClick={() => setTrackPeople(!trackPeople)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={trackPeople}
                            onChange={() => {}} // Managed by parent click
                            className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                          />
                          <div className="min-w-0 flex-1">
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                              <Users className="h-3.5 w-3.5 text-[#1565C0]" />
                              Track People
                            </label>
                            <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                              Detect and count pedestrians, customers, or
                              occupants (`person` category).
                            </p>
                          </div>
                        </div>

                        {trackPeople && (
                          <div
                            className="mt-3.5 space-y-2 border-t border-[#1E3048] pt-3.5 pl-6"
                            onClick={(e) => e.stopPropagation()} // Stop toggle tracking
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="classifyGender"
                                checked={classifyGender}
                                onChange={(e) =>
                                  setClassifyGender(e.target.checked)
                                }
                                className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                              />
                              <label
                                htmlFor="classifyGender"
                                className="flex cursor-pointer items-center gap-1 text-[11px] font-medium text-[#E8EDF5]"
                              >
                                <Sparkles className="h-3 w-3 text-[#60A5FA]" />
                                Gender Classification (InsightFace)
                              </label>
                            </div>
                            <p className="text-[9px] leading-relaxed text-[#5A7A9A]">
                              Classifies cropped head-crops into Male and Female
                              demographics.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Preset: Vehicles */}
                      <div
                        className={cn(
                          'cursor-pointer rounded-lg border p-4 transition-colors',
                          trackVehicles
                            ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                            : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
                        )}
                        onClick={() => setTrackVehicles(!trackVehicles)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={trackVehicles}
                            onChange={() => {}} // Managed by parent click
                            className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                          />
                          <div className="min-w-0 flex-1">
                            <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                              <Car className="h-3.5 w-3.5 text-[#1565C0]" />
                              Track Vehicles
                            </label>
                            <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                              Detect and count traffic flows (`car`, `truck`,
                              `bus`, `motorcycle`, `bicycle`).
                            </p>
                          </div>
                        </div>

                        {trackVehicles && (
                          <div
                            className="mt-3.5 space-y-2 border-t border-[#1E3048] pt-3.5 pl-6"
                            onClick={(e) => e.stopPropagation()} // Stop toggle tracking
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="classifyVehicle"
                                checked={classifyVehicle}
                                onChange={(e) =>
                                  setClassifyVehicle(e.target.checked)
                                }
                                className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                              />
                              <label
                                htmlFor="classifyVehicle"
                                className="cursor-pointer text-[11px] font-medium text-[#E8EDF5]"
                              >
                                Vehicle Subclass Classification
                              </label>
                            </div>
                            <p className="text-[9px] leading-relaxed text-[#5A7A9A]">
                              Preserves class breakdown (car, truck, bike). If
                              disabled, simplifies all to a generic
                              &quot;vehicle&quot; tracker label.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Entry & Exit Crossing Line Preset */}
                    <div
                      className={cn(
                        'cursor-pointer rounded-lg border p-4 transition-colors',
                        entryExitReport
                          ? 'border-[#1565C0]/50 bg-[#1565C0]/5'
                          : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80',
                      )}
                      onClick={() => {
                        const nextVal = !entryExitReport;
                        setEntryExitReport(nextVal);
                        if (nextVal) {
                          setIsDrawingModalOpen(true);
                        } else {
                          setLineCoords(null);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={entryExitReport}
                          onChange={() => {}} // Managed by click
                          className="mt-1 h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                        />
                        <div className="min-w-0 flex-1">
                          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#E8EDF5]">
                            <Activity className="h-3.5 w-3.5 text-[#1565C0]" />
                            Entry & Exit Line Crossing Report
                          </label>
                          <p className="mt-1 text-[10px] leading-relaxed text-[#5A7A9A]">
                            Configure a crossing gate line. Detects and logs
                            IN/OUT count directions for tracked objects.
                          </p>
                        </div>
                      </div>

                      {entryExitReport && (
                        <div
                          className="mt-3.5 flex items-center justify-between border-t border-[#1E3048]/60 pt-3.5 pl-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[11px] text-[#E8EDF5]">
                            {lineCoords
                              ? `Line defined: [(${lineCoords[0][0]}, ${lineCoords[0][1]}), (${lineCoords[1][0]}, ${lineCoords[1][1]})]`
                              : 'No custom line drawn. Defaults to middle horizontal line.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsDrawingModalOpen(true)}
                            className="rounded bg-[#1E3048] px-2.5 py-1 text-[10px] font-semibold text-[#60A5FA] transition-colors hover:bg-[#1E3048]/80"
                          >
                            {lineCoords ? 'Redraw Line' : 'Draw Line'}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Custom Category Selection Toggle */}
                    <div className="overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E]">
                      <div
                        className="flex cursor-pointer items-center justify-between border-b border-[#1E3048] px-4 py-3 hover:bg-[#1E3048]/30"
                        onClick={() => setTrackCustom(!trackCustom)}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-[#1565C0]" />
                          <span className="text-xs font-semibold text-[#E8EDF5]">
                            Track Custom COCO Categories (
                            {selectedCustomClasses.length})
                          </span>
                        </div>
                        <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-bold text-[#E8EDF5]">
                          {trackCustom
                            ? 'Hide List'
                            : 'Expand Classes (74 more)'}
                        </span>
                      </div>

                      {trackCustom && (
                        <div className="space-y-3 p-4">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#5A7A9A]" />
                              <input
                                type="text"
                                placeholder="Search 74 COCO classes (e.g. dog, backpack, chair)..."
                                value={customSearchQuery}
                                onChange={(e) =>
                                  setCustomSearchQuery(e.target.value)
                                }
                                className="h-8.5 w-full rounded-md border border-[#1E3048] bg-[#0D1628] pr-3 pl-8.5 text-xs text-[#E8EDF5] placeholder-[#5A7A9A] focus:border-[#1565C0] focus:outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedCustomClasses([])}
                              className="rounded-md border border-[#1E3048] bg-[#0D1628] px-2.5 py-1 text-[10px] font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                            >
                              Clear All
                            </button>
                          </div>

                          <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-md border border-[#1E3048]/60 bg-[#0D1628]/40 p-2 pr-1">
                            {filteredCocoClasses.map((cls) => {
                              const selected =
                                selectedCustomClasses.includes(cls);
                              return (
                                <div
                                  key={cls}
                                  onClick={() => toggleCustomClass(cls)}
                                  className={cn(
                                    'flex cursor-pointer items-center gap-2 rounded border px-2 py-1 text-xs transition-colors',
                                    selected
                                      ? 'border-[#1565C0]/40 bg-[#1565C0]/15 text-[#60A5FA]'
                                      : 'border-transparent text-[#5A7A9A] hover:bg-[#1E3048]/40 hover:text-[#E8EDF5]',
                                  )}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selected}
                                    readOnly
                                    className="h-3 w-3 rounded border-[#1E3048] text-[#1565C0]"
                                  />
                                  <span className="truncate">{cls}</span>
                                </div>
                              );
                            })}
                            {filteredCocoClasses.length === 0 && (
                              <div className="col-span-2 py-4 text-center text-xs text-[#5A7A9A]">
                                No classes matching &quot;{customSearchQuery}
                                &quot;
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Advanced & Action */}
                <div className="space-y-6 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                  <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-3 text-[#E8EDF5]">
                    <Sliders className="h-4 w-4 text-[#1565C0]" />
                    <h3 className="text-xs font-semibold tracking-wider uppercase">
                      Advanced settings
                    </h3>
                  </div>

                  {/* Confidence Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#5A7A9A]">
                        Detection Confidence
                      </span>
                      <span className="font-semibold text-[#E8EDF5]">
                        {confidenceThreshold.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.05"
                      value={confidenceThreshold}
                      onChange={(e) =>
                        setConfidenceThreshold(parseFloat(e.target.value))
                      }
                      className="w-full accent-[#1565C0]"
                    />
                    <div className="flex justify-between text-[9px] text-[#5A7A9A]/60">
                      <span>0.10 (More matches)</span>
                      <span>1.00 (Strictly precise)</span>
                    </div>
                  </div>

                  {/* Min Track Frames */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#5A7A9A]">
                      Min Track Duration (Frames)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={minTrackFrames}
                      onChange={(e) =>
                        setMinTrackFrames(parseInt(e.target.value) || 1)
                      }
                      className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#5A7A9A]/60">
                      Minimum frames active before track is saved. Helps filter
                      momentary false detections.
                    </p>
                  </div>

                  {/* Track Buffer */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#5A7A9A]">
                      Track Memory Buffer (Frames)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={trackBuffer}
                      onChange={(e) =>
                        setTrackBuffer(parseInt(e.target.value) || 1)
                      }
                      className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#5A7A9A]/60">
                      Buffer frames to remember and stitch a temporarily
                      occluded object track.
                    </p>
                  </div>

                  {/* Global Motion Compensation */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#5A7A9A]">
                      Global Motion Compensation (GMC)
                    </label>
                    <select
                      value={gmcMethod}
                      onChange={(e) => setGmcMethod(e.target.value)}
                      className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
                    >
                      <option value="none">None (Disabled)</option>
                      <option value="ortho">Ortho</option>
                      <option value="aff_sift">Aff Sift</option>
                      <option value="ecc">ECC</option>
                      <option value="sparseOptFlow">Sparse Optical Flow</option>
                    </select>
                    <p className="text-[10px] text-[#5A7A9A]/60">
                      Compensates camera movement (e.g. pan, tilt, zoom) to
                      stabilize object tracking.
                    </p>
                  </div>

                  {/* YOLO Image Size */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#5A7A9A]">
                      YOLO Image Size (Resolution)
                    </label>
                    <input
                      type="number"
                      min="32"
                      step="32"
                      value={imgsz}
                      onChange={(e) =>
                        setImgsz(parseInt(e.target.value) || 480)
                      }
                      className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
                    />
                    <p className="text-[10px] text-[#5A7A9A]/60">
                      Higher resolution (e.g. 1920) improves detection of small
                      objects but runs slower.
                    </p>
                  </div>

                  {/* Execution Device */}
                  <div className="space-y-1">
                    <label className="text-xs text-[#5A7A9A]">
                      Execution Device
                    </label>
                    <select
                      value={device || 'null'}
                      onChange={(e) =>
                        setDevice(
                          e.target.value === 'null' ? null : e.target.value,
                        )
                      }
                      className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
                    >
                      <option value="null">Auto-detect</option>
                      <option value="cpu">CPU</option>
                      <option value="cuda">GPU (CUDA)</option>
                    </select>
                    <p className="text-[10px] text-[#5A7A9A]/60">
                      Inference hardware device (CPU or NVIDIA GPU via CUDA).
                    </p>
                  </div>

                  {/* Re-ID Feature Extraction Classes */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-[#5A7A9A]">
                      Re-ID Tracking Classes
                    </label>
                    <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border border-[#1E3048] bg-[#0A0F1E] p-2.5">
                      {availableReidClasses.map((cls) => {
                        const isChecked = reidClasses.includes(cls);
                        return (
                          <label
                            key={cls}
                            className="flex cursor-pointer items-center gap-2 text-[11px] text-[#E8EDF5]"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setReidClasses(
                                    reidClasses.filter((c) => c !== cls),
                                  );
                                } else {
                                  setReidClasses([...reidClasses, cls]);
                                }
                              }}
                              className="h-3.5 w-3.5 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                            />
                            <span className="capitalize">{cls}</span>
                          </label>
                        );
                      })}
                      {availableReidClasses.length === 0 && (
                        <div className="text-[10px] text-[#5A7A9A] italic">
                          No active classes to select
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] leading-relaxed text-[#5A7A9A]/60">
                      Enables Re-ID feature extraction to link occluded tracks.
                      Re-ID is optimized for &apos;person&apos;.
                    </p>
                  </div>

                  <div className="pt-2">
                    {details.status === 'failed' && (
                      <div className="mb-4 flex items-start gap-2 rounded border border-red-400/15 bg-red-400/5 p-3 text-[11px] text-red-400">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Previous tracker run failed. You can tweak thresholds
                          and trigger a new analysis queue.
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleTriggerAnalysis(details.id)}
                      disabled={
                        triggeringAnalysisId !== null ||
                        details.status === 'processing' ||
                        (!trackPeople &&
                          !trackVehicles &&
                          (!trackCustom || selectedCustomClasses.length === 0))
                      }
                      className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90 disabled:pointer-events-none disabled:opacity-40"
                    >
                      {triggeringAnalysisId !== null ||
                      details.status === 'processing' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {details.status === 'processing'
                            ? 'Processing...'
                            : 'Triggering...'}
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-white" />
                          Run Object Tracking
                        </>
                      )}
                    </button>
                  </div>
                </div>
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
                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {/* Total unique objects */}
                    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                      <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                        Total Unique Tracked
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                        {details.total_objects_count ?? '—'}
                      </p>
                    </div>

                    {/* Peak concurrent objects */}
                    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                      <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                        Peak Concurrency
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                        {details.peak_objects_count ?? '—'}
                      </p>
                    </div>

                    {/* Average concurrent objects */}
                    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                      <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                        Average Concurrency
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                        {details.average_objects_count !== null
                          ? details.average_objects_count.toFixed(2)
                          : '—'}
                      </p>
                    </div>

                    {/* Video Duration */}
                    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                      <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                        Footage Duration
                      </p>
                      <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                        {details.video_duration_seconds !== null
                          ? `${details.video_duration_seconds.toFixed(2)}s`
                          : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Line Crossing Analytics Overview */}
                  {details.report_summary?.line_crossing_analytics && (
                    <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4 md:grid-cols-2">
                      <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                            <Activity className="h-5 w-5 rotate-90" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                              Total Entries (IN)
                            </p>
                            <p className="mt-0.5 text-xl font-bold text-[#E8EDF5]">
                              {
                                details.report_summary.line_crossing_analytics
                                  .total_entries
                              }
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#5A7A9A]">
                          Across crossing gate
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#1E3048]/60 p-2 md:border-t-0 md:border-l">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10 text-red-400">
                            <Activity className="h-5 w-5 -rotate-90" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                              Total Exits (OUT)
                            </p>
                            <p className="mt-0.5 text-xl font-bold text-[#E8EDF5]">
                              {
                                details.report_summary.line_crossing_analytics
                                  .total_exits
                              }
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#5A7A9A]">
                          Across crossing gate
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Main Analysis Pane */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Pane: Media Player & Breakdown Charts */}
                    <div className="space-y-6 lg:col-span-2">
                      <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E] shadow-lg">
                        <div className="flex items-center justify-between border-b border-[#1E3048] bg-[#0D1628] px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Tv className="h-4 w-4 text-[#1565C0]" />
                            <span className="text-xs font-semibold text-[#E8EDF5]">
                              Annotated Tracking HUD Player
                            </span>
                          </div>
                          {/* Re-trigger config */}
                          <button
                            onClick={() => {
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
                            className="flex items-center gap-1.5 rounded border border-[#1E3048] bg-[#0A0F1E] px-2 py-1 text-[10px] font-semibold text-[#E8EDF5] hover:bg-[#1E3048]"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Re-configure Tracker
                          </button>
                        </div>

                        <div className="relative flex aspect-video w-full items-center justify-center bg-black">
                          {details.processed_filepath ? (
                            details.media_type === 'video' ? (
                              <video
                                ref={videoRef}
                                src={`${BACKEND_URL}/${details.processed_filepath}`}
                                controls
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="relative h-full w-full">
                                <Image
                                  src={`${BACKEND_URL}/${details.processed_filepath}`}
                                  alt="Annotated static photo"
                                  fill
                                  className="object-contain"
                                />
                              </div>
                            )
                          ) : (
                            <div className="text-center text-sm text-[#5A7A9A]">
                              No annotated processed source path returned by the
                              worker.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Breakdown charts */}
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        {/* Object count breakdown chart */}
                        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                          <div>
                            <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                              Category Distribution
                            </h3>
                            <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                              Comparison of unique track counts detected per
                              class category.
                            </p>
                          </div>

                          {classBreakdownData.length > 0 ? (
                            <div className="space-y-4">
                              <ResponsiveContainer width="100%" height={160}>
                                <BarChart
                                  data={classBreakdownData}
                                  layout="vertical"
                                  margin={{
                                    top: 0,
                                    right: 10,
                                    left: 35,
                                    bottom: 0,
                                  }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="#1E3048"
                                    horizontal={false}
                                  />
                                  <XAxis
                                    type="number"
                                    stroke="#5A7A9A"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#5A7A9A"
                                    fontSize={10}
                                    axisLine={false}
                                    tickLine={false}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      background: '#0D1628',
                                      border: '1px solid #1E3048',
                                      borderRadius: 6,
                                      color: '#E8EDF5',
                                      fontSize: 11,
                                    }}
                                  />
                                  <Bar
                                    dataKey="count"
                                    fill="#1565C0"
                                    radius={[0, 3, 3, 0]}
                                    barSize={12}
                                  />
                                </BarChart>
                              </ResponsiveContainer>

                              {/* Progress bar visual backup */}
                              <div className="space-y-2 border-t border-[#1E3048]/60 pt-2">
                                {classBreakdownData.slice(0, 3).map((item) => {
                                  const total =
                                    details.total_objects_count || 1;
                                  const percent = Math.round(
                                    (item.count / total) * 100,
                                  );
                                  return (
                                    <div
                                      key={item.name}
                                      className="flex items-center justify-between text-[11px]"
                                    >
                                      <span className="font-medium text-[#E8EDF5]">
                                        {item.name}
                                      </span>
                                      <div className="mx-3 flex flex-1 items-center gap-2">
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                                          <div
                                            className="h-full bg-[#1565C0]"
                                            style={{ width: `${percent}%` }}
                                          />
                                        </div>
                                      </div>
                                      <span className="font-bold text-[#5A7A9A]">
                                        {item.count}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-40 items-center justify-center text-xs text-[#5A7A9A]">
                              No classification data logged.
                            </div>
                          )}
                        </div>

                        {/* Gender Demographic report (InsightFace) */}
                        <div className="flex flex-col justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                          <div>
                            <div className="flex items-center justify-between">
                              <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                                Demographics (insightface)
                              </h3>
                              <span className="rounded border border-emerald-500/15 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                                {details.classify_gender
                                  ? 'ACTIVE'
                                  : 'INACTIVE'}
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                              Gender breakdowns identified from facial head
                              crops of tracked people.
                            </p>
                          </div>

                          {details.classify_gender &&
                          details.report_summary?.gender_breakdown ? (
                            <div className="my-auto space-y-4 pt-4">
                              {/* Male / Female bars */}
                              {Object.entries(
                                details.report_summary.gender_breakdown,
                              ).map(([gender, count]) => {
                                const total =
                                  Object.values(
                                    details.report_summary?.gender_breakdown ||
                                      {},
                                  ).reduce((a, b) => a + b, 0) || 1;
                                const percent = Math.round(
                                  (count / total) * 100,
                                );
                                const colorMap: Record<string, string> = {
                                  male: 'bg-[#1565C0]',
                                  female: 'bg-pink-500',
                                  unknown: 'bg-gray-500',
                                };
                                return (
                                  <div key={gender} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-medium text-[#E8EDF5] capitalize">
                                        {gender}
                                      </span>
                                      <span className="font-semibold text-[#5A7A9A]">
                                        {count} ({percent}%)
                                      </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                                      <div
                                        className={cn(
                                          'h-full',
                                          colorMap[gender] || 'bg-gray-500',
                                        )}
                                        style={{ width: `${percent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="flex flex-1 flex-col items-center justify-center space-y-2 py-6 text-center">
                              <Users className="h-8 w-8 text-[#1E3048]" />
                              <p className="max-w-[200px] text-xs text-[#5A7A9A]">
                                {details.classify_gender
                                  ? 'No human facial profiles were captured or resolved.'
                                  : 'InsightFace classification was not toggled in settings.'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Line Crossing Class Breakdown Table */}
                        {details.report_summary?.line_crossing_analytics && (
                          <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 md:col-span-2">
                            <div>
                              <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                                Line Crossing Class Breakdown
                              </h3>
                              <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                                Detailed breakdown of entries and exits for each
                                detected class category.
                              </p>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse text-left text-xs text-[#E8EDF5]">
                                <thead>
                                  <tr className="border-b border-[#1E3048] font-semibold text-[#5A7A9A]">
                                    <th className="py-2">Category</th>
                                    <th className="py-2 text-right">
                                      Entries (IN)
                                    </th>
                                    <th className="py-2 text-right">
                                      Exits (OUT)
                                    </th>
                                    <th className="py-2 text-right">
                                      Total Crossings
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[#1E3048]/60">
                                  {Object.entries(
                                    details.report_summary
                                      .line_crossing_analytics.class_breakdown,
                                  ).map(([cname, counts]) => {
                                    const total = counts.entry + counts.exit;
                                    return (
                                      <tr
                                        key={cname}
                                        className="transition-colors hover:bg-[#1E3048]/25"
                                      >
                                        <td className="flex items-center gap-1.5 py-2.5 font-medium capitalize">
                                          {cname === 'person' ? (
                                            <Users className="h-3.5 w-3.5 text-[#1565C0]" />
                                          ) : (
                                            <Car className="h-3.5 w-3.5 text-[#1565C0]" />
                                          )}
                                          {cname}
                                        </td>
                                        <td className="py-2.5 text-right font-bold text-emerald-400">
                                          +{counts.entry}
                                        </td>
                                        <td className="py-2.5 text-right font-bold text-red-400">
                                          -{counts.exit}
                                        </td>
                                        <td className="py-2.5 text-right text-[#5A7A9A]">
                                          {total}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Pane: Tracking Timelines list */}
                    <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                      <div className="flex items-center justify-between border-b border-[#1E3048] px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-[#1565C0]" />
                          <h3 className="text-xs font-bold tracking-wider text-[#E8EDF5] uppercase">
                            Timeline Results ({details.results?.length ?? 0})
                          </h3>
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 overflow-y-auto p-4">
                        {!details.results || details.results.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center space-y-2 text-center text-[#5A7A9A]">
                            <Activity className="h-8 w-8 text-[#1E3048]" />
                            <p className="text-xs">
                              No individual tracking paths detected. Try
                              lowering the confidence threshold.
                            </p>
                          </div>
                        ) : (
                          details.results.map((track) => (
                            <div
                              key={track.id}
                              onClick={() => seekVideo(track.start_time)}
                              className="group/item flex cursor-pointer items-center gap-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 transition-all hover:border-[#1565C0]/40"
                            >
                              {/* Video frame preview thumbnail placeholder */}
                              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#1E3048] bg-black">
                                <video
                                  src={`${BACKEND_URL}/${details.filepath}#t=${track.start_time}`}
                                  preload="metadata"
                                  muted
                                  playsInline
                                  className="pointer-events-none h-full w-full object-cover"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-[#E8EDF5] capitalize group-hover/item:text-[#60A5FA]">
                                  {track.class_name} #{track.track_id}
                                </p>
                                <p className="mt-1 text-[10px] text-[#5A7A9A]">
                                  Frames: {track.first_frame} –{' '}
                                  {track.last_frame}
                                </p>
                                {track.gender && (
                                  <span className="mt-1 inline-flex items-center rounded bg-pink-500/10 px-1 py-0.5 text-[9px] font-bold text-pink-400">
                                    {track.gender}
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0 text-right">
                                <span className="inline-block rounded bg-[#1565C0]/10 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                                  {formatSeconds(track.start_time)} –{' '}
                                  {formatSeconds(track.end_time)}
                                </span>
                                <p className="mt-1 text-[9px] text-[#5A7A9A]/60">
                                  Active:{' '}
                                  {(track.end_time - track.start_time).toFixed(
                                    1,
                                  )}
                                  s
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
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
        <LineDrawingModal
          isOpen={isDrawingModalOpen}
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

interface LineDrawingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaUrl: string;
  mediaType: 'photo' | 'video';
  onSave: (coords: number[][]) => void;
}

function LineDrawingModal({
  isOpen,
  onClose,
  mediaUrl,
  mediaType,
  onSave,
}: LineDrawingModalProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [videoResolution, setVideoResolution] = useState({
    width: 1280,
    height: 720,
  });
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redraw whenever points change
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint) {
      // Draw end circles
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#EF4444';
      ctx.fill();

      if (endPoint) {
        // Draw line
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#EF4444';
        ctx.fill();

        // Draw directions
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;

          ctx.font = 'bold 12px sans-serif';

          // Draw IN label
          ctx.fillStyle = '#10B981';
          ctx.fillText('IN', midX + nx * 25 - 6, midY + ny * 25 + 4);

          // Draw OUT label
          ctx.fillStyle = '#EF4444';
          ctx.fillText('OUT', midX - nx * 25 - 10, midY - ny * 25 + 4);
        }
      }
    }
  }, [startPoint, endPoint]);

  // Sync canvas size to display size
  const syncCanvasSize = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const media =
      container.querySelector('video') || container.querySelector('img');
    const canvas = canvasRef.current;
    if (!media || !canvas) return;

    canvas.width = media.clientWidth;
    canvas.height = media.clientHeight;
    setCanvasSize({ width: media.clientWidth, height: media.clientHeight });

    drawCanvas();
  }, [drawCanvas]);

  // Handle window resizing
  useEffect(() => {
    if (isOpen && loaded) {
      window.addEventListener('resize', syncCanvasSize);
      // Let layout settle
      const t = setTimeout(syncCanvasSize, 100);
      return () => {
        window.removeEventListener('resize', syncCanvasSize);
        clearTimeout(t);
      };
    }
  }, [isOpen, loaded, syncCanvasSize]);

  useEffect(() => {
    drawCanvas();
  }, [startPoint, endPoint, drawCanvas]);

  if (!isOpen) return null;

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEndPoint({ x, y });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleMediaLoad = (
    e: React.SyntheticEvent<HTMLVideoElement | HTMLImageElement>,
  ) => {
    const target = e.currentTarget;
    if (target instanceof HTMLVideoElement) {
      setVideoResolution({
        width: target.videoWidth,
        height: target.videoHeight,
      });
    } else if (target instanceof HTMLImageElement) {
      setVideoResolution({
        width: target.naturalWidth,
        height: target.naturalHeight,
      });
    }
    setLoaded(true);
    // Sync size on next frame
    setTimeout(syncCanvasSize, 50);
  };

  const handleSave = () => {
    if (!startPoint || !endPoint || !canvasRef.current) {
      toast.error(
        'Please draw a line first by clicking and dragging on the video preview.',
      );
      return;
    }
    const canvas = canvasRef.current;
    const scaleX = videoResolution.width / canvas.width;
    const scaleY = videoResolution.height / canvas.height;

    const ptA = [
      Math.round(startPoint.x * scaleX),
      Math.round(startPoint.y * scaleY),
    ];
    const ptB = [
      Math.round(endPoint.x * scaleX),
      Math.round(endPoint.y * scaleY),
    ];

    onSave([ptA, ptB]);
    onClose();
  };

  const handleClear = () => {
    setStartPoint(null);
    setEndPoint(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleFlip = () => {
    if (!startPoint || !endPoint) return;
    const temp = startPoint;
    setStartPoint(endPoint);
    setEndPoint(temp);
  };

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5]">
              Draw Entry/Exit Crossing Gate
            </h3>
            <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
              Click and drag on the media preview to draw your crossing detector
              line.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body: Drawing Canvas */}
        <div
          ref={containerRef}
          className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded border border-[#1E3048]/60 bg-black/60"
        >
          {mediaType === 'video' ? (
            <video
              src={mediaUrl}
              muted
              playsInline
              onLoadedMetadata={handleMediaLoad}
              className="pointer-events-none max-h-full max-w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl}
              alt="Media source"
              onLoad={handleMediaLoad}
              className="pointer-events-none max-h-full max-w-full object-contain"
            />
          )}

          {loaded && (
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute cursor-crosshair"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: canvasSize?.width ? `${canvasSize.width}px` : '100%',
                height: canvasSize?.height ? `${canvasSize.height}px` : '100%',
              }}
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[#1E3048] pt-3">
          <div className="text-[10px] text-[#5A7A9A]">
            {startPoint && endPoint ? (
              <span className="font-semibold text-[#10B981]">
                Line defined. Cross from OUT (red) to IN (green) to count as
                entry.
              </span>
            ) : (
              <span>
                No line drawn. Drag your cursor across the zone to draw.
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {startPoint && endPoint && (
              <button
                type="button"
                onClick={handleFlip}
                className="rounded border border-[#F59E0B]/30 px-3 py-1.5 text-xs font-semibold text-[#F59E0B] transition-colors hover:border-[#F59E0B]/60"
              >
                Flip Directions
              </button>
            )}
            <button
              onClick={handleClear}
              className="rounded px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Clear Line
            </button>
            <button
              onClick={onClose}
              className="rounded px-3 py-1.5 text-xs font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded bg-[#1565C0] px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
            >
              Save Line & Close
            </button>
          </div>
        </div>
      </div>
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

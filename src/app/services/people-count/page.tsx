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
  TrendingUp,
  Settings2,
  ChevronLeft,
  Tv,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  uploadPeopleCountMedia,
  listPeopleCountMedia,
  getPeopleCountMediaDetails,
  deletePeopleCountMedia,
} from '@/lib/api/peoplecount';
import { ApiError } from '@/types/api';
import type {
  PeopleCountMedia,
  PeopleCountMediaDetails,
  TrackResult,
} from '@/types/peoplecount';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'library' | 'details';

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
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
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}
    >
      <Icon
        className={cn('h-3 w-3', status === 'processing' && 'animate-spin')}
      />
      {status}
    </span>
  );
}

export default function PeopleCountPage() {
  const [tab, setTab] = useState<Tab>('library');

  // Media Library state
  const [media, setMedia] = useState<PeopleCountMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Upload configuration state
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('video');
  const [minTrackFrames, setMinTrackFrames] = useState(300);
  const [trackBuffer, setTrackBuffer] = useState(150);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.35);

  // Details view state
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [details, setDetails] = useState<PeopleCountMediaDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch all media
  const fetchMedia = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setMediaLoading(true);
    }
    try {
      const res = await listPeopleCountMedia();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia(true);
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
    setDetailsLoading(true);
    try {
      const res = await getPeopleCountMediaDetails(id);
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
    if (tab !== 'details') return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDetails(selectedMediaId);
  }, [selectedMediaId, tab, fetchDetails]);

  useEffect(() => {
    if (!details || !selectedMediaId) return;
    if (details.status !== 'processing' && details.status !== 'pending') return;

    const interval = setInterval(() => {
      getPeopleCountMediaDetails(selectedMediaId)
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
  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadPeopleCountMedia(
        files,
        mediaType,
        minTrackFrames,
        trackBuffer,
        confidenceThreshold,
      );
      toast.success(`Queued ${res.data.length} media file(s) for tracking.`);
      fetchMedia(false);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Upload failed');
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle single deletion
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm('Are you sure you want to delete this media tracking record?')
    ) {
      return;
    }
    try {
      await deletePeopleCountMedia(id);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaType, minTrackFrames, trackBuffer, confidenceThreshold],
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

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            People Count & Video Tracking
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            YOLO + ByteTrack analytics dashboard for occupancy metrics and
            timeline tracking.
          </p>
        </div>
        {tab === 'details' && (
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

      {/* ════════ Tab: Library View ════════ */}
      {tab === 'library' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Upload form / Dropzone */}
            <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E8EDF5]">
                  Upload New Media
                </h2>
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
                    ? 'Uploading & queuing tracking algorithms...'
                    : `Drop ${mediaType === 'photo' ? 'photos' : 'videos'} here or click to browse`}
                </p>
              </div>
            </div>

            {/* Config parameters */}
            <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
              <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-2 text-[#E8EDF5]">
                <Settings2 className="h-4 w-4 text-[#1565C0]" />
                <h3 className="text-xs font-semibold tracking-wider uppercase">
                  Tracking Settings
                </h3>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#5A7A9A]">Confidence Score</span>
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
              </div>

              {/* Min Track Frames */}
              <div className="space-y-1">
                <label className="text-xs text-[#5A7A9A]">
                  Min Track Frames
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
                  Minimum frames active before track is saved.
                </p>
              </div>

              {/* Track Buffer */}
              <div className="space-y-1">
                <label className="text-xs text-[#5A7A9A]">Track Buffer</label>
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
                  Buffer frames to remember a temporarily lost track.
                </p>
              </div>
            </div>
          </div>

          {/* Media Grid */}
          <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
            <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
              <h3 className="text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                Processed Media Library ({media.length})
              </h3>
              <button
                onClick={() => fetchMedia(true)}
                className="rounded-md p-1 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                title="Refresh Library"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {mediaLoading ? (
              <div className="flex h-44 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
              </div>
            ) : media.length === 0 ? (
              <div className="flex h-44 flex-col items-center justify-center gap-1.5">
                <p className="text-sm text-[#5A7A9A]">
                  No media tracking results found.
                </p>
                <p className="text-xs text-[#5A7A9A]/60">
                  Upload a photo or video above to kick off people counting.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {media.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedMediaId(item.id);
                      setTab('details');
                    }}
                    className="group relative cursor-pointer overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E] transition-all hover:border-[#1565C0]/60"
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
                        className="truncate text-xs font-semibold text-[#E8EDF5]"
                        title={item.filename}
                      >
                        {item.filename}
                      </p>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={item.status} />
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

      {/* ════════ Tab: Details & Metrics View ════════ */}
      {tab === 'details' && (
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
                  <h2 className="text-base font-semibold text-[#E8EDF5]">
                    {details.filename}
                  </h2>
                  <p className="mt-0.5 text-xs text-[#5A7A9A]">
                    Created at {new Date(details.created_at).toLocaleString()} ·
                    ID: {details.id}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={details.status} />
                  <button
                    onClick={(e) => handleDelete(details.id, e)}
                    className="flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete Analysis
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {/* Total People Count */}
                <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                  <p className="text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                    Total People Tracked
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                    {details.total_people_count ?? '—'}
                  </p>
                </div>

                {/* Peak People Concurrency */}
                <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                  <p className="text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                    Peak Concurrency
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                    {details.peak_people_count ?? '—'}
                  </p>
                </div>

                {/* Average People Concurrency */}
                <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                  <p className="text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                    Average Concurrency
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                    {details.average_people_count !== null
                      ? details.average_people_count.toFixed(3)
                      : '—'}
                  </p>
                </div>

                {/* Video Duration */}
                <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
                  <p className="text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
                    Footage Duration
                  </p>
                  <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                    {details.video_duration_seconds !== null
                      ? `${details.video_duration_seconds.toFixed(2)}s`
                      : '—'}
                  </p>
                </div>
              </div>

              {/* Main Analysis Pane */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* Left Pane: Media Player */}
                <div className="space-y-4 lg:col-span-2">
                  <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E] shadow-lg">
                    <div className="flex items-center gap-2 border-b border-[#1E3048] bg-[#0D1628] px-4 py-2.5">
                      <Tv className="h-4 w-4 text-[#1565C0]" />
                      <span className="text-xs font-semibold text-[#E8EDF5]">
                        Annotated Output Viewer
                      </span>
                    </div>

                    <div className="relative flex aspect-video w-full items-center justify-center bg-black">
                      {details.status === 'processing' ||
                      details.status === 'pending' ? (
                        <div className="space-y-2 p-5 text-center">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#1565C0]" />
                          <p className="text-sm text-[#E8EDF5]">
                            Running YOLO + ByteTrack background worker...
                          </p>
                          <p className="text-xs text-[#5A7A9A]">
                            Annotated bounding boxes and unique tracking
                            timelines will show once completed.
                          </p>
                        </div>
                      ) : details.status === 'failed' ? (
                        <div className="space-y-2 p-5 text-center">
                          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
                          <p className="text-sm text-[#E8EDF5]">
                            Background analysis pipeline failed.
                          </p>
                        </div>
                      ) : details.processed_filepath ? (
                        details.media_type === 'video' ? (
                          <video
                            ref={videoRef}
                            src={`${BACKEND_URL}/${details.filepath}`}
                            controls
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="relative h-full w-full">
                            <Image
                              src={`${BACKEND_URL}/${details.processed_filepath}`}
                              alt="Annotated static path"
                              fill
                              className="object-contain"
                            />
                          </div>
                        )
                      ) : (
                        <div className="text-center text-sm text-[#5A7A9A]">
                          No processed video source path returned.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Pane: Unique Track results */}
                <div className="flex h-[460px] flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <div className="flex items-center gap-1.5 border-b border-[#1E3048] px-4 py-3">
                    <Users className="h-4 w-4 text-[#1565C0]" />
                    <h3 className="text-xs font-bold tracking-wider text-[#E8EDF5] uppercase">
                      Tracking Timelines ({details.results?.length ?? 0})
                    </h3>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto p-4">
                    {!details.results || details.results.length === 0 ? (
                      <div className="flex h-full items-center justify-center text-center">
                        <p className="text-xs text-[#5A7A9A]">
                          No individual tracking timelines found.
                        </p>
                      </div>
                    ) : (
                      details.results.map((track) => (
                        <div
                          key={track.id}
                          onClick={() => seekVideo(track.start_time)}
                          className="group/item flex cursor-pointer items-center gap-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 transition-all hover:border-[#1565C0]/40"
                        >
                          {/* Person video frame thumbnail */}
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
                            <p className="truncate text-xs font-bold text-[#E8EDF5] group-hover/item:text-[#60A5FA]">
                              Track #{track.track_id} ({track.class_name})
                              {track.name && (
                                <span className="ml-1 font-semibold text-[#60A5FA]">
                                  — {track.name}
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-[10px] text-[#5A7A9A]">
                              Frames: {track.first_frame} – {track.last_frame} (
                              {track.total_frames} frames)
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="inline-block rounded bg-[#1565C0]/10 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                              {formatSeconds(track.start_time)} –{' '}
                              {formatSeconds(track.end_time)}
                            </span>
                            <p className="mt-1 text-[9px] text-[#5A7A9A]/60">
                              Duration:{' '}
                              {(track.end_time - track.start_time).toFixed(1)}s
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

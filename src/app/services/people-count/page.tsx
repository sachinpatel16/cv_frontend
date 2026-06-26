'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  Upload,
  Users,
  ImageIcon,
  Video,
  Trash2,
  Loader2,
  RotateCcw,
  AlertCircle,
  Settings2,
  ChevronLeft,
  Tv,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import { usePeopleCountStore } from '@/stores/peopleCountStore';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { getPeopleCountMediaDetails } from '@/lib/api/peoplecount';
import type { PeopleCountMedia } from '@/types/peoplecount';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function formatSeconds(sec: number | null): string {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Library View ──
function LibraryView() {
  const {
    media,
    mediaLoading,
    uploading,
    mediaType,
    minTrackFrames,
    trackBuffer,
    confidenceThreshold,
    setMediaType,
    setMinTrackFrames,
    setTrackBuffer,
    setConfidenceThreshold,
    fetchMedia,
    addMedia,
    removeMedia,
    openDetails,
  } = usePeopleCountStore();

  const accept: Record<string, string[]> =
    mediaType === 'photo'
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }
      : { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    disabled: uploading,
    onDrop: addMedia,
  });

  // Poll if any media is processing
  useEffect(() => {
    const hasPending = media.some(
      (m) => m.status === 'processing' || m.status === 'pending',
    );
    if (!hasPending) return;
    const timer = setInterval(() => fetchMedia(false), 5000);
    return () => clearInterval(timer);
  }, [media, fetchMedia]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Upload form */}
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

        {/* Config params */}
        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <div className="flex items-center gap-1.5 border-b border-[#1E3048] pb-2 text-[#E8EDF5]">
            <Settings2 className="h-4 w-4 text-[#1565C0]" />
            <h3 className="text-xs font-semibold tracking-wider uppercase">
              Tracking Settings
            </h3>
          </div>
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
          <div className="space-y-1">
            <label className="text-xs text-[#5A7A9A]">Min Track Frames</label>
            <input
              type="number"
              min="1"
              value={minTrackFrames}
              onChange={(e) => setMinTrackFrames(parseInt(e.target.value) || 1)}
              className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs text-[#E8EDF5] focus:border-[#1565C0] focus:outline-none"
            />
            <p className="text-[10px] text-[#5A7A9A]/60">
              Minimum frames active before track is saved.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[#5A7A9A]">Track Buffer</label>
            <input
              type="number"
              min="1"
              value={trackBuffer}
              onChange={(e) => setTrackBuffer(parseInt(e.target.value) || 1)}
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
            className="rounded-md p-1 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
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
            {media.map((item: PeopleCountMedia) => (
              <div
                key={item.id}
                onClick={() => openDetails(item.id)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this media tracking record?'))
                          removeMedia(item.id);
                      }}
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
  );
}

// ── Details View ──
function DetailsView() {
  const {
    selectedMediaId,
    details,
    detailsLoading,
    removeMedia,
    closeDetails,
    fetchMedia,
  } = usePeopleCountStore();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Load details on mount + poll if processing
  useEffect(() => {
    if (!selectedMediaId) return;
    usePeopleCountStore.getState().openDetails(selectedMediaId);
  }, [selectedMediaId]);

  // Poll if processing
  useEffect(() => {
    if (!details || !selectedMediaId) return;
    if (details.status !== 'processing' && details.status !== 'pending') return;
    const timer = setInterval(() => {
      getPeopleCountMediaDetails(selectedMediaId)
        .then((res) => {
          usePeopleCountStore.setState({ details: res.data });
          if (res.data.status === 'completed' || res.data.status === 'failed')
            fetchMedia(false);
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(timer);
  }, [details, selectedMediaId, fetchMedia]);

  const seekVideo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  if (detailsLoading && !details) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
      </div>
    );
  }

  if (!details) return null;

  return (
    <div className="space-y-6">
      {/* Info bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#E8EDF5]">
            {details.filename}
          </h2>
          <p className="mt-0.5 text-xs text-[#5A7A9A]">
            Created at {new Date(details.created_at).toLocaleString()} · ID:{' '}
            {details.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={details.status} />
          <button
            onClick={() => {
              if (confirm('Delete this analysis record?')) {
                removeMedia(details.id);
                closeDetails();
              }
            }}
            className="flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Analysis
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: 'Total People Tracked',
            value: details.total_people_count ?? '—',
          },
          {
            label: 'Peak Concurrency',
            value: details.peak_people_count ?? '—',
          },
          {
            label: 'Average Concurrency',
            value:
              details.average_people_count !== null
                ? details.average_people_count.toFixed(3)
                : '—',
          },
          {
            label: 'Footage Duration',
            value:
              details.video_duration_seconds !== null
                ? `${details.video_duration_seconds.toFixed(2)}s`
                : '—',
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center"
          >
            <p className="text-xs font-semibold tracking-wider text-[#5A7A9A] uppercase">
              {label}
            </p>
            <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">{value}</p>
          </div>
        ))}
      </div>

      {/* Video + Tracks */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Video player */}
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
                    Annotated bounding boxes will appear once completed.
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
                      alt="Annotated"
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

        {/* Track list */}
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
                      Duration: {(track.end_time - track.start_time).toFixed(1)}
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
  );
}

// ── Main Page ──
export default function PeopleCountPage() {
  const { activeTab, fetchMedia, closeDetails } = usePeopleCountStore();

  useEffect(() => {
    fetchMedia(true);
  }, [fetchMedia]);

  return (
    <div className="max-w-6xl space-y-6">
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
        {activeTab === 'details' && (
          <button
            onClick={closeDetails}
            className="flex items-center gap-1.5 rounded-md border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-xs font-medium text-[#E8EDF5] hover:bg-[#1E3048]"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Library
          </button>
        )}
      </div>
      {activeTab === 'library' && <LibraryView />}
      {activeTab === 'details' && <DetailsView />}
    </div>
  );
}

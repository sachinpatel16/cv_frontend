import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { Loader2, Trash2, Tv, Users, AlertCircle } from 'lucide-react';
import { usePeopleCountStore } from '@/stores/peopleCountStore';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { getPeopleCountMediaDetails } from '@/lib/api/peoplecount';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function formatSeconds(sec: number | null): string {
  if (sec === null) return '—';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DetailsView() {
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
                    src={`${BACKEND_URL}/${details.processed_filepath}`}
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

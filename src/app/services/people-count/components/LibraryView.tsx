import React, { useEffect } from 'react';
import Image from 'next/image';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  ImageIcon,
  Video,
  Trash2,
  Loader2,
  RotateCcw,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePeopleCountStore } from '@/stores/peopleCountStore';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import type { PeopleCountMedia } from '@/types/peoplecount';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function LibraryView() {
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

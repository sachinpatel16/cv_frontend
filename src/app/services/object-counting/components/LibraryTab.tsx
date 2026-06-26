'use client';

import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import {
  ImageIcon,
  Video,
  Upload,
  Loader2,
  RotateCcw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { useObjectCountingStore } from '@/stores/objectCountingStore';
import type { ObjectCountMedia } from '@/types/objectcount';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function LibraryTab() {
  const {
    media,
    mediaLoading,
    uploading,
    mediaType,
    setMediaType,
    uploadMedia,
    fetchMedia,
    removeMedia,
    setSelectedMediaId,
    setActiveTab,
  } = useObjectCountingStore();

  const accept: Record<string, string[]> =
    mediaType === 'photo'
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }
      : { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => uploadMedia(accepted),
    accept,
    disabled: uploading,
  });

  return (
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
                Upload your raw footage first, then select configuration presets
                below to trigger tracking.
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
              Select a media item to configure custom COCO targets and trigger
              background models.
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
              Upload a photo or video above to start analyzing custom objects.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {media.map((item: ObjectCountMedia) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedMediaId(item.id);
                  if (
                    item.status === 'processing' ||
                    item.status === 'completed'
                  ) {
                    setActiveTab('results');
                  } else {
                    setActiveTab('config');
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
                    <StatusBadge status={item.status} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
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

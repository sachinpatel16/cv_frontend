'use client';

import { useState, useCallback } from 'react';
import { Search, Video, Loader2, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { searchBySelfie, searchVideo } from '@/lib/api/peoplefind';
import { ApiError } from '@/types/api';
import type {
  InputComponentProps,
  MediaSource,
} from '@/features/analyses/types';

// ── Selfie upload (extracted from person-search) ──────────────────────────────

function SelfieUpload({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onChange(accepted[0]);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  if (file) {
    const preview = URL.createObjectURL(file);
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#1565C0]/40 bg-[#1565C0]/5 px-4 py-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selfie preview"
            className="h-full w-full object-cover"
          />
        </div>
        <span className="flex-1 truncate text-sm text-[#E8EDF5]">
          {file.name}
        </span>
        <button
          onClick={() => onChange(null)}
          className="text-[#5A7A9A] transition-colors hover:text-[#E8EDF5]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors',
        isDragActive
          ? 'border-[#1565C0] bg-[#1565C0]/10'
          : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
      )}
    >
      <input {...getInputProps()} />
      <Search
        className={cn(
          'h-8 w-8',
          isDragActive ? 'text-[#60A5FA]' : 'text-[#5A7A9A]',
        )}
      />
      <p className="text-center text-sm text-[#5A7A9A]">
        Drop a clear selfie here or click to browse
      </p>
    </div>
  );
}

// ── Person-Find Input Component ───────────────────────────────────────────────

export default function PersonFindInput({
  media,
  onSubmit,
}: InputComponentProps) {
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(45);
  const [searching, setSearching] = useState(false);

  const videos = media.filter((m) => m.media_type === 'video');

  // ── Search all media ──
  async function handleSearchAll() {
    if (!selfieFile) return;
    setSearching(true);
    try {
      const res = await searchBySelfie(selfieFile, threshold / 100);
      toast.success(`Found ${res.data.results.length} match(es)`);
      onSubmit(res.data.id);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }

  // ── Search specific video ──
  async function handleVideoSearch(videoId: string) {
    if (!selfieFile) {
      toast.error('Upload a reference selfie first');
      return;
    }
    setSearching(true);
    try {
      const res = await searchVideo(selfieFile, videoId, threshold / 100);
      toast.success('Video search submitted — results will appear shortly');
      onSubmit(res.data.id);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Video search failed');
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ── Selfie + threshold ── */}
      <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <h2 className="text-sm font-semibold text-[#E8EDF5]">
          Reference Selfie
        </h2>
        <p className="text-xs text-[#5A7A9A]">
          Upload a clear photo of the person you want to find.
        </p>

        <SelfieUpload file={selfieFile} onChange={setSelfieFile} />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Similarity threshold
            </label>
            <span className="text-xs font-semibold text-[#E8EDF5]">
              {threshold}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={95}
            step={5}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full accent-[#1565C0]"
          />
        </div>

        <button
          onClick={handleSearchAll}
          disabled={!selfieFile || searching}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90 disabled:opacity-40"
        >
          {searching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4" /> Search All Media
            </>
          )}
        </button>
      </div>

      {/* ── Video-specific search ── */}
      <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <h2 className="text-sm font-semibold text-[#E8EDF5]">
          Search Specific Video
        </h2>
        <p className="text-xs text-[#5A7A9A]">
          Select a video from your selected media to search within. Runs as a
          background job.
        </p>

        {videos.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#1E3048]">
            <p className="text-xs text-[#5A7A9A]">
              No videos in your selection
            </p>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {videos.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg border border-[#1E3048] px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Video className="h-4 w-4 shrink-0 text-[#5A7A9A]" />
                  <span className="truncate text-sm text-[#E8EDF5]">
                    {v.filename}
                  </span>
                </div>
                <button
                  onClick={() => handleVideoSearch(v.id)}
                  disabled={!selfieFile || searching}
                  className="shrink-0 rounded-md bg-[#1E3048] px-3 py-1 text-xs font-medium text-[#E8EDF5] transition-colors hover:bg-[#1565C0] disabled:opacity-40"
                >
                  Search
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Film, ImageIcon, Upload, X, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import { getDetectorDef } from './ActivityDetectorSidebar';

export function MediaTab() {
  const {
    selectedDetector,
    mediaType,
    uploadedFile,
    uploading,
    setFile,
    uploadMedia,
    setInterval,
    interval,
  } = useActivityDetectionStore();

  const det = getDetectorDef(selectedDetector);
  const [localType, setLocalType] = useState<'photo' | 'video'>(mediaType);

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) setFile(accepted[0], localType);
    },
    [localType, setFile],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:
      localType === 'photo'
        ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.bmp'] }
        : { 'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm'] },
    maxFiles: 1,
  });

  const handleTypeSwitch = (type: 'photo' | 'video') => {
    setLocalType(type);
    setFile(null, type);
  };

  return (
    <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
      {/* Detector header */}
      <div className="flex items-center gap-3">
        <div
          className="rounded-xl p-2.5"
          style={{ background: `${det.accent}18` }}
        >
          <det.Icon className="h-5 w-5" style={{ color: det.accent }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[#E8EDF5]">{det.label}</h2>
          <p className="text-xs text-[#5A7A9A]">{det.description}</p>
        </div>
      </div>

      {/* Media type toggle */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {(['photo', 'video'] as const).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeSwitch(type)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors',
              localType === type
                ? 'bg-[#1E3048] text-[#E8EDF5]'
                : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
            )}
          >
            {type === 'photo' ? (
              <ImageIcon className="h-3.5 w-3.5" />
            ) : (
              <Film className="h-3.5 w-3.5" />
            )}
            {type === 'photo' ? '📷 Photo' : '🎬 Video'}
          </button>
        ))}
      </div>

      {/* File display or dropzone */}
      {uploadedFile ? (
        <div>
          {/* Preview */}
          <div className="mb-3 overflow-hidden rounded-xl border border-[#1E3048] bg-black/40">
            {localType === 'video' ? (
              <video
                src={URL.createObjectURL(uploadedFile)}
                controls
                className="max-h-48 w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(uploadedFile)}
                alt="Preview"
                className="max-h-48 w-full object-contain"
              />
            )}
          </div>
          {/* File info row */}
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3"
            style={{
              borderColor: `${det.accent}40`,
              background: `${det.accent}08`,
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-[#1E3048] p-2">
                {localType === 'video' ? (
                  <Film className="h-4 w-4 text-[#5A7A9A]" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-[#5A7A9A]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#E8EDF5]">
                  {uploadedFile.name}
                </p>
                <p className="text-xs text-[#5A7A9A]">
                  {(uploadedFile.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null, localType)}
              className="shrink-0 rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-red-400"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
            isDragActive
              ? 'border-amber-500/60 bg-amber-500/5'
              : 'border-[#1E3048] bg-[#0A0F1E]/50 hover:border-amber-500/30 hover:bg-amber-500/5',
          )}
        >
          <input {...getInputProps()} />
          <div className="mb-3 rounded-xl bg-[#1E3048] p-4">
            {localType === 'video' ? (
              <Film className="h-8 w-8 text-[#5A7A9A]" />
            ) : (
              <ImageIcon className="h-8 w-8 text-[#5A7A9A]" />
            )}
          </div>
          <p className="text-sm font-medium text-[#E8EDF5]">
            {isDragActive
              ? `Drop your ${localType} here`
              : `Drop a ${localType} file here`}
          </p>
          <p className="mt-1 text-xs text-[#5A7A9A]">
            {localType === 'video'
              ? 'MP4, MOV, AVI or MKV · up to 4 GB'
              : 'JPG, PNG, WEBP or BMP'}
          </p>
        </div>
      )}

      {/* Frame interval — video only */}
      {localType === 'video' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#5A7A9A]">
              Frame sampling interval
            </label>
            <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-[#E8EDF5]">
              {interval.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.5}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-full accent-amber-500"
          />
          <div className="flex justify-between text-[9px] text-[#5A7A9A]">
            <span>0.5s — max detail</span>
            <span>5.0s — fastest</span>
          </div>
        </div>
      )}

      {/* Upload button */}
      <button
        onClick={uploadMedia}
        disabled={!uploadedFile || uploading}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-500 text-sm font-semibold text-white transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> Upload &amp; Continue
          </>
        )}
      </button>
    </div>
  );
}

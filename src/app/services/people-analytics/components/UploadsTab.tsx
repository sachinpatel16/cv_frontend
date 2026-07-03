import React, { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, Video, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { getRawVideoUrl } from '@/lib/api/peopleanalytics';

export function UploadsTab() {
  const {
    uploads,
    uploading,
    selectedUploadIds,
    fetchUploads,
    addUploads,
    removeUpload: handleRemoveUpload,
    toggleSelectUpload: handleToggleSelect,
    openWizard,
  } = usePersonAnalysisStore();

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 10,
    onDrop: async (files) => {
      await addUploads(files);
    },
  });

  return (
    <div className="space-y-6">
      {/* Upload + Actions */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
          <p className="text-xs font-semibold text-[#5A7A9A]">
            Upload Saved Videos
          </p>
        </div>

        <div className="space-y-4 p-5">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              isDragActive
                ? 'border-[#1565C0] bg-[#1565C0]/5'
                : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#5A7A9A]" />
            ) : (
              <Upload className="h-8 w-8 text-[#5A7A9A]" />
            )}
            <p className="text-sm text-[#5A7A9A]">
              {isDragActive
                ? 'Drop videos here…'
                : 'Drag & drop video files or click to browse'}
            </p>
            <p className="text-xs text-[#5A7A9A]/60">
              MP4, AVI, MOV — up to 10 files
            </p>
          </div>

          {/* Uploaded file chips */}
          {uploads.length > 0 && (
            <div className="space-y-2">
              {uploads.map((u) => (
                <div
                  key={u.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-all select-none',
                    selectedUploadIds.includes(u.id)
                      ? 'border-[#3B82F6] bg-[#1565C0]/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80 hover:bg-[#1E3048]/20',
                  )}
                  onClick={() => handleToggleSelect(u.id)}
                >
                  {/* Custom Round Selection Indicator */}
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                      selectedUploadIds.includes(u.id)
                        ? 'border-[#60A5FA] bg-[#1565C0]'
                        : 'border-[#1E3048] bg-[#0D1628]',
                    )}
                  >
                    {selectedUploadIds.includes(u.id) && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Video Thumbnail Preview */}
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border border-[#1E3048]/80 bg-[#070B14]">
                    <video
                      src={`${getRawVideoUrl(u.saved_path)}#t=0.5`}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-xs transition-colors',
                      selectedUploadIds.includes(u.id)
                        ? 'font-semibold text-[#E8EDF5]'
                        : 'text-[#5A7A9A]',
                    )}
                  >
                    {u.original_name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveUpload(u.id);
                    }}
                    className="rounded p-0.5 text-[#5A7A9A] hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={openWizard}
                disabled={selectedUploadIds.length === 0}
                className={cn(
                  'mt-2 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all',
                  selectedUploadIds.length > 0
                    ? 'bg-[#1565C0] shadow-lg shadow-[#1565C0]/20 hover:bg-[#1976D2] active:bg-[#0D47A1]'
                    : 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-50',
                )}
              >
                {selectedUploadIds.length > 0
                  ? `Configure & Process (${selectedUploadIds.length} Selected) →`
                  : 'Configure & Process →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

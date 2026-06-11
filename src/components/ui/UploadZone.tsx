'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadZoneProps {
  label?: string;
  accept?: Record<string, string[]>;
  file: File | null;
  onChange: (file: File | null) => void;
}

export function UploadZone({
  label = 'Drop file here or click to browse',
  accept,
  file,
  onChange,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onChange(accepted[0]);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
  });

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#1565C0]/40 bg-[#1565C0]/5 px-4 py-3">
        <File className="h-5 w-5 shrink-0 text-[#60A5FA]" />
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
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
        isDragActive
          ? 'border-[#1565C0] bg-[#1565C0]/10'
          : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
      )}
    >
      <input {...getInputProps()} />
      <Upload
        className={cn(
          'h-8 w-8 transition-colors',
          isDragActive ? 'text-[#60A5FA]' : 'text-[#5A7A9A]',
        )}
      />
      <p className="text-center text-sm text-[#5A7A9A]">{label}</p>
    </div>
  );
}

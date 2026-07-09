'use client';

import React from 'react';
import Image from 'next/image';
import { Tv, RotateCcw } from 'lucide-react';

interface VideoPreviewHUDProps {
  processedFilepath: string | null;
  mediaType: 'video' | 'photo';
  filepath: string;
  backendUrl: string;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onReconfigure: () => void;
}

export default function VideoPreviewHUD({
  processedFilepath,
  mediaType,
  filepath,
  backendUrl,
  videoRef,
  onReconfigure,
}: VideoPreviewHUDProps) {
  return (
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
          onClick={onReconfigure}
          className="flex items-center gap-1.5 rounded border border-[#1E3048] bg-[#0A0F1E] px-2 py-1 text-[10px] font-semibold text-[#E8EDF5] transition-colors hover:bg-[#1E3048]"
        >
          <RotateCcw className="h-3 w-3" />
          Re-configure Tracker
        </button>
      </div>

      <div className="relative flex aspect-video w-full items-center justify-center bg-black">
        {processedFilepath ? (
          mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={`${backendUrl}/${processedFilepath}`}
              controls
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="relative h-full w-full">
              <Image
                src={`${backendUrl}/${processedFilepath}`}
                alt="Annotated static photo"
                fill
                className="object-contain"
              />
            </div>
          )
        ) : (
          <div className="text-center text-sm text-[#5A7A9A]">
            No annotated processed source path returned by the worker.
          </div>
        )}
      </div>
    </div>
  );
}

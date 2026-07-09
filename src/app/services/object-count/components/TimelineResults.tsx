'use client';

import React from 'react';
import { Layers, Activity } from 'lucide-react';
import type { ObjectTrackResult } from '@/types/objectcount';

interface TimelineResultsProps {
  results: ObjectTrackResult[] | null | undefined;
  filepath: string;
  backendUrl: string;
  onSeek: (time: number) => void;
  formatSeconds: (sec: number) => string;
}

export default function TimelineResults({
  results,
  filepath,
  backendUrl,
  onSeek,
  formatSeconds,
}: TimelineResultsProps) {
  return (
    <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] shadow-lg">
      <div className="flex items-center justify-between border-b border-[#1E3048] px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-[#1565C0]" />
          <h3 className="text-xs font-bold tracking-wider text-[#E8EDF5] uppercase">
            Timeline Results ({results?.length ?? 0})
          </h3>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!results || results.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center space-y-2 text-center text-[#5A7A9A]">
            <Activity className="h-8 w-8 text-[#1E3048]" />
            <p className="text-xs">
              No individual tracking paths detected. Try lowering the confidence
              threshold.
            </p>
          </div>
        ) : (
          results.map((track) => (
            <div
              key={track.id}
              onClick={() => onSeek(track.start_time)}
              className="group/item flex cursor-pointer items-center gap-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 transition-all hover:border-[#1565C0]/40"
            >
              {/* Video frame preview thumbnail placeholder */}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#1E3048] bg-black">
                <video
                  src={`${backendUrl}/${filepath}#t=${track.start_time}`}
                  preload="metadata"
                  muted
                  playsInline
                  className="pointer-events-none h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-[#E8EDF5] capitalize group-hover/item:text-[#60A5FA]">
                  {track.class_name} #{track.track_id}
                </p>
                <p className="mt-1 text-[10px] text-[#5A7A9A]">
                  Frames: {track.first_frame} – {track.last_frame}
                </p>
                {track.gender && (
                  <span className="mt-1 inline-flex items-center rounded bg-pink-500/10 px-1 py-0.5 text-[9px] font-bold text-pink-400">
                    {track.gender}
                  </span>
                )}
              </div>
              <div className="shrink-0 text-right">
                <span className="inline-block rounded bg-[#1565C0]/10 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                  {formatSeconds(track.start_time)} –{' '}
                  {formatSeconds(track.end_time)}
                </span>
                <p className="mt-1 text-[9px] text-[#5A7A9A]/60">
                  Active: {(track.end_time - track.start_time).toFixed(1)}s
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

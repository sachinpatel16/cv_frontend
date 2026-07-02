'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface TimelineItem {
  id: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'info' | 'clean' | string;
  tooltip: string;
}

interface UnifiedAlertTimelineProps {
  items: TimelineItem[];
  maxTs: number;
  onSeek: (t: number) => void;
  thresholdSeconds?: number;
}

const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 4,
  smoking_confirmed: 4,
  warning: 3,
  smoking_likely: 3,
  info: 2,
  holding: 2,
  clean: 1,
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-400',
  smoking_confirmed: 'bg-red-400',
  warning: 'bg-amber-400',
  smoking_likely: 'bg-amber-400',
  info: 'bg-blue-400',
  holding: 'bg-blue-400',
  clean: 'bg-emerald-400',
};

function fmtTs(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function UnifiedAlertTimeline({
  items,
  maxTs,
  onSeek,
  thresholdSeconds = 3.0,
}: UnifiedAlertTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (items.length === 0 || maxTs === 0) return null;

  // 1. Sort items by timestamp ascending
  const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);

  // 2. Group into contiguous segments based on threshold
  const segments: {
    id: string;
    startTimestamp: number;
    endTimestamp: number;
    maxSeverity: string;
    tooltips: string[];
  }[] = [];

  for (const item of sorted) {
    if (segments.length === 0) {
      segments.push({
        id: item.id,
        startTimestamp: item.timestamp,
        endTimestamp: item.timestamp,
        maxSeverity: item.severity,
        tooltips: [item.tooltip],
      });
    } else {
      const last = segments[segments.length - 1];
      if (item.timestamp - last.endTimestamp <= thresholdSeconds) {
        // Merge
        last.endTimestamp = item.timestamp;
        const currentPriority = SEVERITY_PRIORITY[item.severity] ?? 0;
        const lastPriority = SEVERITY_PRIORITY[last.maxSeverity] ?? 0;
        if (currentPriority > lastPriority) {
          last.maxSeverity = item.severity;
        }
        last.tooltips.push(item.tooltip);
      } else {
        segments.push({
          id: item.id,
          startTimestamp: item.timestamp,
          endTimestamp: item.timestamp,
          maxSeverity: item.severity,
          tooltips: [item.tooltip],
        });
      }
    }
  }

  // Handle clicking on the background track to seek to exact percentage
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct * maxTs);
  };

  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
        Alert Timeline — click to seek
      </p>

      {/* Interactive track wrapper */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative flex h-6 cursor-pointer items-center justify-between"
      >
        {/* Background track line */}
        <div className="absolute right-0 left-0 h-2 rounded-full bg-[#1E3048]" />

        {/* Render merged segment lines */}
        {segments.map((seg) => {
          const leftPct = (seg.startTimestamp / maxTs) * 100;
          const duration = seg.endTimestamp - seg.startTimestamp;
          const widthPct = Math.max((duration / maxTs) * 100, 2.0); // min 2% width so single dots are clickable pills

          const colorClass = SEVERITY_COLOR[seg.maxSeverity] ?? 'bg-blue-400';
          const isCritical =
            seg.maxSeverity === 'critical' ||
            seg.maxSeverity === 'smoking_confirmed';

          const tooltipText = `${fmtTs(seg.startTimestamp)}${
            duration > 0 ? ` - ${fmtTs(seg.endTimestamp)}` : ''
          }\n${seg.tooltips.slice(0, 5).join('\n')}${
            seg.tooltips.length > 5
              ? `\n...and ${seg.tooltips.length - 5} more`
              : ''
          }`;

          return (
            <button
              key={seg.id}
              type="button"
              title={tooltipText}
              onClick={(e) => {
                e.stopPropagation(); // don't trigger track click
                onSeek(seg.startTimestamp);
              }}
              style={{
                left: `${leftPct}%`,
                width: `${widthPct}%`,
              }}
              className={cn(
                'absolute top-1/2 z-10 h-3 -translate-y-1/2 rounded-full border border-[#0D1628] transition-all hover:scale-y-125',
                colorClass,
                isCritical && 'animate-pulse',
              )}
            />
          );
        })}
      </div>

      <div className="mt-1 flex justify-between text-[9px] text-[#5A7A9A]/60">
        <span>0:00</span>
        <span>{fmtTs(maxTs)}</span>
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Upload,
  Flame,
  Activity,
  History,
  User,
  Users,
  ArrowDownCircle,
  Zap,
  AlertOctagon,
  Package,
  MapPin,
  Moon,
  Smartphone,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  Video,
  Film,
  RotateCcw,
  X,
  ChevronRight,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  uploadVideoForAnalysis,
  getSmokingSessionStatus,
  getSmokingSessionHistory,
} from '@/lib/api/smokingdetect';
import { ApiError } from '@/types/api';
import type {
  SmokingSession,
  SmokingEvent,
  SmokingSessionHistoryItem,
} from '@/types/smokingdetect';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/** Poll every 10 seconds as per configuration */
const POLL_INTERVAL_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
// To add a new detector in the future:
//  1. Add a new entry to ACTIVITY_CATALOG below with status: 'coming_soon'
//  2. When the API is ready, change status to 'live'
//  3. Add a handler branch in handleSubmit() for the new activity id
//  4. Create a results renderer component for that activity
// ─────────────────────────────────────────────────────────────────────────────

type ActivityId =
  | 'smoking'
  | 'fall'
  | 'fighting'
  | 'aggressive'
  | 'trespassing'
  | 'theft'
  | 'mobile_phone'
  | 'sleeping'
  | 'standing'
  | 'sitting';

interface ActivityDef {
  id: ActivityId;
  label: string;
  shortLabel: string;
  description: string;
  Icon: React.ElementType;
  accent: string; // CSS hex for inline styles
  accentBg: string; // Tailwind bg class
  accentText: string; // Tailwind text class
  accentBorder: string; // Tailwind border class
  status: 'live' | 'coming_soon';
}

const ACTIVITY_CATALOG: ActivityDef[] = [
  {
    id: 'smoking',
    label: 'Smoking Detection',
    shortLabel: 'Smoking',
    description:
      'Multi-signal AI: cigarette + lit tip + smoke plume confirmation',
    Icon: Flame,
    accent: '#F59E0B',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    status: 'live',
  },
  {
    id: 'fall',
    label: 'Fall Detection',
    shortLabel: 'Fall',
    description: 'Identify people who have fallen or collapsed on camera',
    Icon: ArrowDownCircle,
    accent: '#EF4444',
    accentBg: 'bg-red-500/10',
    accentText: 'text-red-400',
    accentBorder: 'border-red-500/40',
    status: 'coming_soon',
  },
  {
    id: 'fighting',
    label: 'Fighting Detection',
    shortLabel: 'Fighting',
    description: 'Detect physical altercations and brawls between individuals',
    Icon: Zap,
    accent: '#F97316',
    accentBg: 'bg-orange-500/10',
    accentText: 'text-orange-400',
    accentBorder: 'border-orange-500/40',
    status: 'coming_soon',
  },
  {
    id: 'aggressive',
    label: 'Aggressive Behavior',
    shortLabel: 'Aggressive',
    description: 'Flag aggressive or threatening posture and gestures',
    Icon: AlertOctagon,
    accent: '#DC2626',
    accentBg: 'bg-red-600/10',
    accentText: 'text-red-500',
    accentBorder: 'border-red-600/40',
    status: 'coming_soon',
  },
  {
    id: 'trespassing',
    label: 'Trespassing Detection',
    shortLabel: 'Trespassing',
    description: 'Identify people entering restricted or off-limit zones',
    Icon: MapPin,
    accent: '#8B5CF6',
    accentBg: 'bg-violet-500/10',
    accentText: 'text-violet-400',
    accentBorder: 'border-violet-500/40',
    status: 'coming_soon',
  },
  {
    id: 'theft',
    label: 'Theft Suspicion',
    shortLabel: 'Theft',
    description: 'Detect suspicious object handling or concealment behavior',
    Icon: Package,
    accent: '#A855F7',
    accentBg: 'bg-purple-500/10',
    accentText: 'text-purple-400',
    accentBorder: 'border-purple-500/40',
    status: 'coming_soon',
  },
  {
    id: 'mobile_phone',
    label: 'Mobile Phone Usage',
    shortLabel: 'Phone Use',
    description: 'Detect prohibited mobile phone use in restricted areas',
    Icon: Smartphone,
    accent: '#06B6D4',
    accentBg: 'bg-cyan-500/10',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/40',
    status: 'coming_soon',
  },
  {
    id: 'sleeping',
    label: 'Sleeping Detection',
    shortLabel: 'Sleeping',
    description: 'Identify individuals sleeping on duty or in public spaces',
    Icon: Moon,
    accent: '#6366F1',
    accentBg: 'bg-indigo-500/10',
    accentText: 'text-indigo-400',
    accentBorder: 'border-indigo-500/40',
    status: 'coming_soon',
  },
  {
    id: 'standing',
    label: 'Standing Detection',
    shortLabel: 'Standing',
    description: 'Track and analyze prolonged standing posture patterns',
    Icon: User,
    accent: '#10B981',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    status: 'coming_soon',
  },
  {
    id: 'sitting',
    label: 'Sitting Detection',
    shortLabel: 'Sitting',
    description: 'Monitor sitting behavior and posture in surveilled spaces',
    Icon: Users,
    accent: '#3B82F6',
    accentBg: 'bg-blue-500/10',
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-500/40',
    status: 'coming_soon',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtTs(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

type OverallStatus = SmokingSession['overall_status'];

function getInteractiveMsg(
  sessionStatus: string | null,
  overallStatus: OverallStatus,
  confirmedCount: number,
  totalEvents: number,
): { emoji: string; heading: string; sub: string } {
  if (!sessionStatus)
    return {
      emoji: '📹',
      heading: 'Upload a video clip to start scanning',
      sub: 'Select a detector from the left, drop your footage, then hit Start.',
    };
  if (sessionStatus === 'pending')
    return {
      emoji: '🔍',
      heading: 'Your clip is queued for analysis…',
      sub: 'Job submitted and waiting for a worker to pick it up.',
    };
  if (sessionStatus === 'processing')
    return {
      emoji: '⚙️',
      heading: 'Scanning your footage frame by frame…',
      sub: 'The AI is inspecting each sampled frame. Usually 30–90 seconds.',
    };
  if (sessionStatus === 'failed')
    return {
      emoji: '⚠️',
      heading: 'Analysis encountered an error',
      sub: 'Something went wrong during processing. Please re-upload and try again.',
    };
  // completed
  if (overallStatus === 'smoking_confirmed')
    return {
      emoji: '🚬',
      heading: `We spotted ${confirmedCount} confirmed smoking moment${confirmedCount !== 1 ? 's' : ''} in your clip`,
      sub: `${totalEvents} total event${totalEvents !== 1 ? 's' : ''} — cigarette, lit tip, and smoke plume all confirmed.`,
    };
  if (overallStatus === 'smoking_likely')
    return {
      emoji: '🔎',
      heading: `Found ${totalEvents} potential smoking instance${totalEvents !== 1 ? 's' : ''} — review recommended`,
      sub: 'Partial signal match detected. Manual review advised to confirm.',
    };
  if (overallStatus === 'holding')
    return {
      emoji: '✋',
      heading: `Detected ${totalEvents} moment${totalEvents !== 1 ? 's' : ''} of cigarette holding`,
      sub: 'A cigarette was detected but no active smoking (lit tip or smoke) was confirmed.',
    };
  return {
    emoji: '✅',
    heading: 'All clear — no smoking activity detected in this clip',
    sub: 'The AI found no cigarettes, lit tips, or smoke plumes in this footage.',
  };
}

const OVERALL_BADGE_MAP: Record<
  string,
  { label: string; cls: string; dotCls: string; pulse: boolean }
> = {
  smoking_confirmed: {
    label: 'Smoking Confirmed',
    cls: 'text-red-400 bg-red-400/10 border border-red-400/20',
    dotCls: 'bg-red-400',
    pulse: true,
  },
  smoking_likely: {
    label: 'Smoking Likely',
    cls: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
    dotCls: 'bg-amber-400',
    pulse: false,
  },
  holding: {
    label: 'Holding',
    cls: 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20',
    dotCls: 'bg-yellow-400',
    pulse: false,
  },
  clean: {
    label: 'Clean',
    cls: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20',
    dotCls: 'bg-emerald-400',
    pulse: false,
  },
};

const EVENT_BADGE_MAP: Record<
  string,
  { cls: string; dotCls: string; label: string }
> = {
  smoking_confirmed: {
    cls: 'text-red-400 bg-red-400/10',
    dotCls: 'bg-red-400',
    label: 'Confirmed',
  },
  smoking_likely: {
    cls: 'text-amber-400 bg-amber-400/10',
    dotCls: 'bg-amber-400',
    label: 'Likely',
  },
  holding: {
    cls: 'text-yellow-400 bg-yellow-400/10',
    dotCls: 'bg-yellow-400',
    label: 'Holding',
  },
  clean: {
    cls: 'text-emerald-400 bg-emerald-400/10',
    dotCls: 'bg-emerald-400',
    label: 'Clean',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SessionStatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; Icon: React.ElementType }> = {
    completed: {
      cls: 'text-emerald-400 bg-emerald-400/10',
      Icon: CheckCircle2,
    },
    pending: { cls: 'text-amber-400 bg-amber-400/10', Icon: Clock },
    processing: { cls: 'text-blue-400 bg-blue-400/10', Icon: Loader2 },
    failed: { cls: 'text-red-400 bg-red-400/10', Icon: AlertCircle },
  };
  const { cls, Icon } = map[status] ?? map.pending;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${cls}`}
    >
      <Icon
        className={cn('h-3 w-3', status === 'processing' && 'animate-spin')}
      />
      {status}
    </span>
  );
}

function VideoDropzone({
  file,
  onChange,
  accentBg,
  accentBorder,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  accentBg: string;
  accentBorder: string;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onChange(accepted[0]);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] },
    maxFiles: 1,
  });

  if (file) {
    return (
      <div
        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${accentBorder} ${accentBg}`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg bg-[#1E3048] p-2">
            <Video className="h-4 w-4 text-[#5A7A9A]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#E8EDF5]">
              {file.name}
            </p>
            <p className="text-xs text-[#5A7A9A]">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
        </div>
        <button
          onClick={() => onChange(null)}
          className="shrink-0 rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-red-400"
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
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200',
        isDragActive
          ? 'border-amber-500/60 bg-amber-500/5'
          : 'border-[#1E3048] bg-[#0A0F1E]/50 hover:border-amber-500/30 hover:bg-amber-500/5',
      )}
    >
      <input {...getInputProps()} />
      <div className="mb-3 rounded-xl bg-[#1E3048] p-4">
        <Film className="h-8 w-8 text-[#5A7A9A]" />
      </div>
      <p className="text-sm font-medium text-[#E8EDF5]">
        {isDragActive ? 'Drop your video here' : 'Drop a video file here'}
      </p>
      <p className="mt-1 text-xs text-[#5A7A9A]">
        MP4, MOV, AVI or MKV · up to 4 GB
      </p>
    </div>
  );
}

interface TimelineEventGroup {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  maxStatus: string;
  events: SmokingEvent[];
}

function groupTimelineEvents(
  events: SmokingEvent[],
  interval = 1.0,
): TimelineEventGroup[] {
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  const groups: TimelineEventGroup[] = [];
  let currentGroup: TimelineEventGroup | null = null;

  const severityOrder: Record<string, number> = {
    clean: 0,
    holding: 1,
    smoking_likely: 2,
    smoking_confirmed: 3,
  };

  const proximityThreshold = Math.max(3, interval * 1.5);

  for (const ev of sorted) {
    if (!currentGroup) {
      currentGroup = {
        id: ev.id,
        startTimestamp: ev.timestamp,
        endTimestamp: ev.timestamp,
        maxStatus: ev.status,
        events: [ev],
      };
    } else {
      const diff = ev.timestamp - currentGroup.endTimestamp;
      if (diff <= proximityThreshold) {
        currentGroup.endTimestamp = ev.timestamp;
        const currentSev = severityOrder[currentGroup.maxStatus] ?? 0;
        const newSev = severityOrder[ev.status] ?? 0;
        if (newSev > currentSev) {
          currentGroup.maxStatus = ev.status;
          currentGroup.id = ev.id; // scroll/seek to the most severe event in this group on click
        }
        currentGroup.events.push(ev);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: ev.id,
          startTimestamp: ev.timestamp,
          endTimestamp: ev.timestamp,
          maxStatus: ev.status,
          events: [ev],
        };
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

function TimelineStrip({
  events,
  maxTs,
  interval,
  onDotClick,
}: {
  events: SmokingEvent[];
  maxTs: number;
  interval: number;
  onDotClick: (id: string) => void;
}) {
  if (events.length === 0) return null;

  const groups = groupTimelineEvents(events, interval);

  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
      <p className="mb-3 text-[10px] font-medium tracking-wider text-[#5A7A9A] uppercase">
        Timeline — click a marker to scroll to instance
      </p>

      {/* Ruler bar */}
      <div className="relative mt-1 mb-2 h-2 rounded-full bg-[#1E3048]">
        {groups.map((group) => {
          const startPct =
            maxTs > 0 ? (group.startTimestamp / maxTs) * 100 : 50;
          const endPct = maxTs > 0 ? (group.endTimestamp / maxTs) * 100 : 50;
          const isRange = group.endTimestamp > group.startTimestamp;

          if (isRange) {
            const leftPct = Math.min(startPct, 98);
            const rightPct = Math.min(endPct, 100);
            const widthPct = Math.max(rightPct - leftPct, 1.5);

            return (
              <button
                key={group.id}
                title={`${fmtTs(group.startTimestamp)} - ${fmtTs(group.endTimestamp)} (${Math.round(group.endTimestamp - group.startTimestamp)}s) · status: ${group.maxStatus.replace(/_/g, ' ')} · ${group.events.length} appearance(s)`}
                onClick={() => onDotClick(group.id)}
                style={{
                  left: `${leftPct}%`,
                  width: `${widthPct}%`,
                }}
                className={cn(
                  'absolute top-1/2 z-10 h-3 -translate-y-1/2 rounded-full border border-[#0D1628] shadow-sm shadow-black/40 transition-all hover:scale-y-125 hover:brightness-110',
                  group.maxStatus === 'smoking_confirmed'
                    ? 'bg-red-500'
                    : group.maxStatus === 'smoking_likely'
                      ? 'bg-amber-500'
                      : group.maxStatus === 'holding'
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500',
                )}
              />
            );
          } else {
            const pct = Math.min(Math.max(startPct, 1), 98);
            return (
              <button
                key={group.id}
                title={`${fmtTs(group.startTimestamp)} · status: ${group.maxStatus.replace(/_/g, ' ')}`}
                onClick={() => onDotClick(group.id)}
                style={{
                  left: `${pct}%`,
                }}
                className={cn(
                  'absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0D1628] shadow-sm shadow-black/40 transition-transform hover:scale-125',
                  group.maxStatus === 'smoking_confirmed'
                    ? 'bg-red-500'
                    : group.maxStatus === 'smoking_likely'
                      ? 'bg-amber-500'
                      : group.maxStatus === 'holding'
                        ? 'bg-yellow-500'
                        : 'bg-emerald-500',
                  group.maxStatus === 'smoking_confirmed' && 'animate-pulse',
                )}
              />
            );
          }
        })}
      </div>

      {/* Time labels */}
      <div className="mt-1 flex justify-between text-[9px] text-[#5A7A9A]/60">
        <span>0:00</span>
        <span>{fmtTs(maxTs)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab Content Components
// ─────────────────────────────────────────────────────────────────────────────

function ComingSoonPanel({ activity }: { activity: ActivityDef }) {
  const Icon = activity.Icon;
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628] py-24 text-center">
      <div
        className={cn('mb-5 rounded-2xl p-5', activity.accentBg)}
        style={{ boxShadow: `0 0 40px ${activity.accent}18` }}
      >
        <Icon className={cn('h-10 w-10', activity.accentText)} />
      </div>
      <h2 className="text-base font-semibold text-[#E8EDF5]">
        {activity.label}
      </h2>
      <p className="mt-2 max-w-sm text-sm text-[#5A7A9A]">
        {activity.description}
      </p>
      <div className="mt-6 flex items-center gap-2 rounded-full border border-[#1E3048] bg-[#0A0F1E] px-5 py-2">
        <span className="text-xs text-[#5A7A9A]">🚧</span>
        <span className="text-xs font-medium text-[#5A7A9A]">
          This detector is coming soon — stay tuned
        </span>
      </div>
    </div>
  );
}

function AnalysisTab({
  session,
  msg,
  overallBadge,
  onViewResults,
}: {
  session: SmokingSession | null;
  msg: { emoji: string; heading: string; sub: string };
  overallBadge: (typeof OVERALL_BADGE_MAP)[string] | null;
  onViewResults: () => void;
}) {
  const isRunning =
    session?.status === 'pending' || session?.status === 'processing';

  return (
    <div className="space-y-4">
      {/* Main status card */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {isRunning ? (
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-amber-500/20" />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-amber-500" />
              <Activity className="h-6 w-6 text-amber-400" />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1E3048]">
              <span className="text-3xl">{msg.emoji}</span>
            </div>
          )}
          <div>
            <p className="text-base font-semibold text-[#E8EDF5]">
              {msg.heading}
            </p>
            <p className="mt-1 text-sm text-[#5A7A9A]">{msg.sub}</p>
          </div>
          {overallBadge && (
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold ${overallBadge.cls}`}
            >
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  overallBadge.dotCls,
                  overallBadge.pulse && 'animate-pulse',
                )}
              />
              {overallBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Session metadata */}
      {session && (
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
          <p className="mb-3 text-[10px] font-semibold tracking-widest text-[#5A7A9A] uppercase">
            Session Info
          </p>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              {
                label: 'Status',
                value: <SessionStatusBadge status={session.status} />,
              },
              {
                label: 'Events found',
                value: (
                  <span className="font-bold text-[#E8EDF5]">
                    {session.events.length}
                  </span>
                ),
              },
              {
                label: 'Interval',
                value: (
                  <span className="font-mono text-[#E8EDF5]">
                    {session.interval}s
                  </span>
                ),
              },
              {
                label: 'Submitted',
                value: (
                  <span className="text-[#E8EDF5]">
                    {timeAgo(session.created_at)}
                  </span>
                ),
              },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <dt className="text-[#5A7A9A]">{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[10px] text-[#5A7A9A]">
            Session ID: <span className="font-mono">{session.id}</span>
          </p>
        </div>
      )}

      {/* Polling note */}
      {isRunning && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#1E3048] bg-[#0A0F1E] px-4 py-3">
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-amber-400" />
          <p className="text-xs text-[#5A7A9A]">
            Auto-checking every 10 seconds. You can switch tabs — we&apos;ll
            notify you when it&apos;s done.
          </p>
        </div>
      )}

      {session?.status === 'completed' && (
        <button
          onClick={onViewResults}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-500 text-sm font-semibold text-white transition-all hover:bg-amber-400"
        >
          <ChevronRight className="h-4 w-4" />
          View Results
        </button>
      )}
    </div>
  );
}

function ResultsTab({
  session,
  events,
  confirmedCount,
  likelyCount,
  holdingCount,
  maxTs,
  msg,
  overallBadge,
  videoRef,
  onSeek,
}: {
  session: SmokingSession | null;
  events: SmokingEvent[];
  confirmedCount: number;
  likelyCount: number;
  holdingCount: number;
  maxTs: number;
  msg: { emoji: string; heading: string; sub: string };
  overallBadge: (typeof OVERALL_BADGE_MAP)[string] | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onSeek: (timestamp: number) => void;
}) {
  if (!session) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
        <Film className="h-8 w-8 text-[#1E3048]" />
        <p className="text-sm text-[#5A7A9A]">
          No results yet — upload a video to begin
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Interactive message banner */}
      <div
        className={cn(
          'rounded-xl border p-4',
          overallBadge
            ? overallBadge.cls.includes('red')
              ? 'border-red-400/20 bg-red-400/5'
              : overallBadge.cls.includes('amber')
                ? 'border-amber-400/20 bg-amber-400/5'
                : overallBadge.cls.includes('emerald')
                  ? 'border-emerald-400/20 bg-emerald-400/5'
                  : 'border-yellow-400/20 bg-yellow-400/5'
            : 'border-[#1E3048] bg-[#0D1628]',
        )}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none">{msg.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-[#E8EDF5]">
              {msg.heading}
            </p>
            <p className="mt-0.5 text-xs text-[#5A7A9A]">{msg.sub}</p>
          </div>
          {overallBadge && (
            <span
              className={`ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${overallBadge.cls}`}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  overallBadge.dotCls,
                  overallBadge.pulse && 'animate-pulse',
                )}
              />
              {overallBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Total Events',
            value: events.length,
            cls: 'text-[#E8EDF5]',
          },
          { label: 'Confirmed', value: confirmedCount, cls: 'text-red-400' },
          { label: 'Likely', value: likelyCount, cls: 'text-amber-400' },
          { label: 'Holding', value: holdingCount, cls: 'text-yellow-400' },
        ].map(({ label, value, cls }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center"
          >
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
            <p className="mt-1 text-[10px] text-[#5A7A9A]">{label}</p>
          </div>
        ))}
      </div>

      {/* Video playback */}
      {session.status === 'completed' && session.video_out_path ? (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="flex items-center justify-between border-b border-[#1E3048] p-4">
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-[#E8EDF5]">
                Annotated Video Playback
              </span>
            </div>
            <span className="text-xs text-[#5A7A9A]">
              Click timeline events to seek specific occurrences
            </span>
          </div>
          <div className="flex justify-center bg-black/40 p-4">
            <video
              ref={videoRef}
              src={`${BACKEND_URL}/${session.video_out_path}`}
              controls
              className="max-h-[480px] w-full rounded-lg bg-black"
            />
          </div>
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
          <p className="text-sm text-[#5A7A9A]">
            Video is being compiled or is unavailable
          </p>
        </div>
      )}

      {/* Timeline */}
      {events.length > 0 && (
        <TimelineStrip
          events={events}
          maxTs={maxTs}
          interval={session.interval}
          onDotClick={(eventId) => {
            const ev = events.find((e) => e.id === eventId);
            if (ev) {
              onSeek(ev.timestamp);
            }
          }}
        />
      )}
    </div>
  );
}

function HistoryTab({
  history,
  loading,
  onRefresh,
  onSelect,
}: {
  history: SmokingSessionHistoryItem[];
  loading: boolean;
  onRefresh: () => void;
  onSelect: (item: SmokingSessionHistoryItem) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
          <p className="text-xs font-semibold text-[#5A7A9A]">
            Past Sessions ({history.length})
          </p>
          <button
            onClick={onRefresh}
            className="rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-[#5A7A9A]">No previous sessions found</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1E3048]">
            {history.map((item) => {
              const badge = item.overall_status
                ? OVERALL_BADGE_MAP[item.overall_status]
                : null;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item)}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#1E3048]/40"
                >
                  {/* Icon */}
                  <div className="shrink-0 rounded-lg bg-[#1E3048] p-2">
                    <Flame className="h-4 w-4 text-amber-400/70" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SessionStatusBadge status={item.status} />
                      {badge && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${badge.cls}`}
                        >
                          <span
                            className={cn('h-1 w-1 rounded-full', badge.dotCls)}
                          />
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-[#5A7A9A]">
                      {item.total_events} event
                      {item.total_events !== 1 ? 's' : ''} · {item.interval}s
                      interval · {timeAgo(item.created_at)}
                    </p>
                    {item.user && (
                      <p className="mt-0.5 text-[10px] text-[#5A7A9A]/60">
                        {item.user.email}
                      </p>
                    )}
                  </div>

                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A] opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'upload' | 'analysis' | 'results' | 'history';

export default function ActivityDetectionPage() {
  const [selectedActivityId, setSelectedActivityId] =
    useState<ActivityId>('smoking');
  const [tab, setTab] = useState<Tab>('upload');

  // Upload state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frameInterval, setFrameInterval] = useState(1.0);
  const [submitting, setSubmitting] = useState(false);

  // Session state (smoking)
  const [session, setSession] = useState<SmokingSession | null>(null);
  const [events, setEvents] = useState<SmokingEvent[]>([]);

  // History
  const [history, setHistory] = useState<SmokingSessionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Video player
  const [showAnnotatedVideo, setShowAnnotatedVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleTimelineSeek = useCallback((timestamp: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = timestamp;
      videoRef.current.play().catch(() => {
        // play might be blocked by browser autoplay policy
      });
    }
  }, []);

  const selectedActivity = ACTIVITY_CATALOG.find(
    (a) => a.id === selectedActivityId,
  )!;

  // ── Polling — 10 s ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;
    if (session.status === 'completed' || session.status === 'failed') return;

    const timer = setInterval(async () => {
      try {
        const res = await getSmokingSessionStatus(session.id);
        setSession(res.data);
        setEvents(res.data.events);

        if (res.data.status === 'completed') {
          const confirmed = res.data.events.filter(
            (e) => e.status === 'smoking_confirmed',
          ).length;
          toast.success(
            confirmed > 0
              ? `🚬 Found ${confirmed} confirmed smoking moment${confirmed !== 1 ? 's' : ''}!`
              : '✅ Analysis complete — no smoking detected',
            { duration: 5000 },
          );
          setTab('results');
        } else if (res.data.status === 'failed') {
          toast.error('Analysis failed. Please re-upload and try again.');
        }
      } catch {
        // silently continue polling — transient network error
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [session]);

  // ── Fetch history ───────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getSmokingSessionHistory();
      setHistory(res.data);
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!videoFile) return;

    // ── EXTENSIBILITY HOOK ─────────────────────────────────────────────────
    // Add new activity API call branches here as detectors go live:
    // if (selectedActivityId === 'fall') { ... }
    // if (selectedActivityId === 'fighting') { ... }
    // ──────────────────────────────────────────────────────────────────────

    if (selectedActivityId === 'smoking') {
      setSubmitting(true);
      try {
        const res = await uploadVideoForAnalysis(videoFile, frameInterval);
        setSession(res.data);
        setEvents([]);
        setShowAnnotatedVideo(false);
        toast.success('Analysis job submitted! Auto-checking every 10s…');
        setTab('analysis');
      } catch (err) {
        if (err instanceof ApiError) toast.error(err.message);
        else toast.error('Submission failed. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  }

  function handleReset() {
    setVideoFile(null);
    setSession(null);
    setEvents([]);
    setShowAnnotatedVideo(false);
    setTab('upload');
  }

  function handleScrollToEvent(eventId: string) {
    const el = document.getElementById(`event-card-${eventId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    el.classList.add(
      'ring-2',
      'ring-amber-400',
      'ring-offset-1',
      'ring-offset-[#0D1628]',
    );
    setTimeout(() => {
      el.classList.remove(
        'ring-2',
        'ring-amber-400',
        'ring-offset-1',
        'ring-offset-[#0D1628]',
      );
    }, 1500);
  }

  async function handleLoadHistorySession(item: SmokingSessionHistoryItem) {
    try {
      const res = await getSmokingSessionStatus(item.id);
      setSession(res.data);
      setEvents(res.data.events);
      toast.success(
        item.total_events > 0
          ? `Loaded session — ${item.total_events} event${item.total_events !== 1 ? 's' : ''} found`
          : 'Loaded session — no events recorded',
      );
      setTab('results');
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to load session');
    }
  }

  // ── Derived ─────────────────────────────────────────────────────────────────
  const confirmedCount = events.filter(
    (e) => e.status === 'smoking_confirmed',
  ).length;
  const likelyCount = events.filter(
    (e) => e.status === 'smoking_likely',
  ).length;
  const holdingCount = events.filter((e) => e.status === 'holding').length;
  const maxTs =
    events.length > 0 ? Math.max(...events.map((e) => e.timestamp)) : 0;

  const msg = getInteractiveMsg(
    session?.status ?? null,
    session?.overall_status ?? null,
    confirmedCount,
    events.length,
  );
  const overallBadge = session?.overall_status
    ? OVERALL_BADGE_MAP[session.overall_status]
    : null;

  const TABS: {
    id: Tab;
    label: string;
    Icon: React.ElementType;
    count?: number;
  }[] = [
    { id: 'upload', label: 'Upload', Icon: Upload },
    { id: 'analysis', label: 'Analysis', Icon: Activity },
    {
      id: 'results',
      label: 'Results',
      Icon: CheckCircle2,
      count: events.length || undefined,
    },
    {
      id: 'history',
      label: 'History',
      Icon: History,
      count: history.length || undefined,
    },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            Activity Detection
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            AI-powered behavioural analysis — scan footage for suspicious or
            notable activities.
          </p>
        </div>
        {session && (
          <button
            onClick={handleReset}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-red-400/30 hover:text-red-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Analysis
          </button>
        )}
      </div>

      {/* Body: sidebar + content */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* ── Left: Activity Selector ── */}
        <div>
          <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
            <div className="border-b border-[#1E3048] px-4 py-3">
              <p className="text-xs font-semibold text-[#E8EDF5]">
                Activity Detectors
              </p>
              <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                {ACTIVITY_CATALOG.filter((a) => a.status === 'live').length}{' '}
                live ·{' '}
                {
                  ACTIVITY_CATALOG.filter((a) => a.status === 'coming_soon')
                    .length
                }{' '}
                coming soon
              </p>
            </div>
            <div className="divide-y divide-[#1E3048]">
              {ACTIVITY_CATALOG.map((activity) => {
                const isSelected = selectedActivityId === activity.id;
                const isLive = activity.status === 'live';
                const Icon = activity.Icon;
                return (
                  <button
                    key={activity.id}
                    onClick={() => {
                      setSelectedActivityId(activity.id);
                      if (activity.status === 'coming_soon') {
                        setTab('upload'); // reset to upload tab — will show coming soon panel
                      }
                    }}
                    className={cn(
                      'group flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-all duration-150',
                      isSelected
                        ? `${activity.accentBg} ${activity.accentBorder}`
                        : 'border-transparent hover:bg-[#1E3048]/40',
                    )}
                  >
                    <div
                      className={cn(
                        'shrink-0 rounded-lg p-1.5 transition-colors',
                        isSelected ? activity.accentBg : 'bg-[#1E3048]',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-3.5 w-3.5 transition-colors',
                          isSelected ? activity.accentText : 'text-[#5A7A9A]',
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-xs font-medium transition-colors',
                        isSelected ? activity.accentText : 'text-[#E8EDF5]',
                      )}
                    >
                      {activity.label}
                    </span>
                    {isLive ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                        LIVE
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-[#1E3048] px-1.5 py-0.5 text-[9px] font-medium text-[#5A7A9A]">
                        SOON
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right: Main Content ── */}
        <div className="min-w-0 space-y-4">
          {selectedActivity.status === 'coming_soon' ? (
            <ComingSoonPanel activity={selectedActivity} />
          ) : (
            <>
              {/* Tab nav */}
              <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
                {TABS.map(({ id, label, Icon, count }) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
                      tab === id
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                    {count !== undefined && count > 0 && (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0 text-[9px] font-bold',
                          tab === id
                            ? 'bg-white/20 text-white'
                            : 'bg-[#1E3048] text-[#5A7A9A]',
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ── Tab: Upload ── */}
              {tab === 'upload' && (
                <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
                  {/* Activity header */}
                  <div className="flex items-center gap-3">
                    <div
                      className="rounded-xl p-2.5"
                      style={{ background: `${selectedActivity.accent}18` }}
                    >
                      <selectedActivity.Icon
                        className="h-5 w-5"
                        style={{ color: selectedActivity.accent }}
                      />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#E8EDF5]">
                        {selectedActivity.label}
                      </h2>
                      <p className="text-xs text-[#5A7A9A]">
                        {selectedActivity.description}
                      </p>
                    </div>
                  </div>

                  {/* Dropzone */}
                  <VideoDropzone
                    file={videoFile}
                    onChange={setVideoFile}
                    accentBg={selectedActivity.accentBg}
                    accentBorder={selectedActivity.accentBorder}
                  />

                  {/* Interval slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-[#5A7A9A]">
                        Frame sampling interval
                      </label>
                      <span className="rounded-md bg-[#1E3048] px-2 py-0.5 font-mono text-xs font-semibold text-[#E8EDF5]">
                        {frameInterval.toFixed(1)}s
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={5.0}
                      step={0.5}
                      value={frameInterval}
                      onChange={(e) => setFrameInterval(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[9px] text-[#5A7A9A]">
                      <span>0.5s — max detail</span>
                      <span>5.0s — fastest</span>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!videoFile || submitting}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-amber-500 text-sm font-semibold text-white transition-all hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start {selectedActivity.shortLabel} Analysis
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* ── Tab: Analysis ── */}
              {tab === 'analysis' && (
                <AnalysisTab
                  session={session}
                  msg={msg}
                  overallBadge={overallBadge}
                  onViewResults={() => setTab('results')}
                />
              )}

              {/* ── Tab: Results ── */}
              {tab === 'results' && (
                <ResultsTab
                  session={session}
                  events={events}
                  confirmedCount={confirmedCount}
                  likelyCount={likelyCount}
                  holdingCount={holdingCount}
                  maxTs={maxTs}
                  msg={msg}
                  overallBadge={overallBadge}
                  videoRef={videoRef}
                  onSeek={handleTimelineSeek}
                />
              )}

              {/* ── Tab: History ── */}
              {tab === 'history' && (
                <HistoryTab
                  history={history}
                  loading={historyLoading}
                  onRefresh={fetchHistory}
                  onSelect={handleLoadHistorySession}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

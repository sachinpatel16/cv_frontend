'use client';

import { useRef, useState } from 'react';
import {
  Video,
  Film,
  X,
  Info,
  History,
  ChevronDown,
  ChevronRight,
  ArrowDownCircle,
  Zap,
  MapPin,
  Clock,
  Users,
  Moon,
  User,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import type { ActivityTab } from '@/stores/activityDetectionStore';
import { getAnnotatedVideoUrl } from '@/lib/api/smokingdetect';
import type { ActivityAlert } from '@/types/activity';
import type { SmokingEvent } from '@/types/smokingdetect';
import { UnifiedAlertTimeline } from './UnifiedAlertTimeline';
import type { TimelineItem } from './UnifiedAlertTimeline';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtTs(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Severity config
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<
  string,
  { cls: string; dot: string; label: string }
> = {
  critical: {
    cls: 'text-red-400 bg-red-400/10 border-red-400/20',
    dot: 'bg-red-400',
    label: 'Critical',
  },
  warning: {
    cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    dot: 'bg-amber-400',
    label: 'Warning',
  },
  info: {
    cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    dot: 'bg-blue-400',
    label: 'Info',
  },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEVERITY_MAP[severity] ?? SEVERITY_MAP.info;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
        s.cls,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Activity type → display metadata
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_TYPE_META: Record<
  string,
  { label: string; Icon: React.ElementType; iconCls: string }
> = {
  falling: {
    label: 'Fall Detection',
    Icon: ArrowDownCircle,
    iconCls: 'text-red-400',
  },
  slipping: {
    label: 'Slipping',
    Icon: ArrowDownCircle,
    iconCls: 'text-orange-400',
  },
  aggression: { label: 'Aggression', Icon: Zap, iconCls: 'text-orange-400' },
  intrusion: {
    label: 'Intrusion / Trespassing',
    Icon: MapPin,
    iconCls: 'text-violet-400',
  },
  loitering: { label: 'Loitering', Icon: Clock, iconCls: 'text-amber-400' },
  occupancy_overlimit: {
    label: 'Occupancy Limit',
    Icon: Users,
    iconCls: 'text-cyan-400',
  },
  sleeping: { label: 'Sleeping', Icon: Moon, iconCls: 'text-indigo-400' },
  walking: {
    label: 'Walking / Running',
    Icon: User,
    iconCls: 'text-emerald-400',
  },
};

function activityMeta(type: string) {
  return (
    ACTIVITY_TYPE_META[type] ?? {
      label: type.replace(/_/g, ' '),
      Icon: AlertTriangle,
      iconCls: 'text-[#5A7A9A]',
    }
  );
}

// UnifiedAlertTimeline is imported from ./UnifiedAlertTimeline

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot modal
// ─────────────────────────────────────────────────────────────────────────────

function SnapshotModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-4xl overflow-hidden rounded-2xl border border-[#1E3048]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Alert snapshot"
          className="max-h-[88vh] object-contain"
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-detector collapsible alert card
// ─────────────────────────────────────────────────────────────────────────────

interface AlertCluster {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  trackIds: number[];
  maxSeverity: 'info' | 'warning' | 'critical' | string;
  snapshots: string[];
  bboxes: [number, number, number, number][];
  alerts: ActivityAlert[];
}

function ClusteredAlertRow({
  cluster,
  onSnapshotClick,
}: {
  cluster: AlertCluster;
  onSnapshotClick: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasMultiple = cluster.alerts.length > 1;
  const timeStr = hasMultiple
    ? `${fmtTs(cluster.startTimestamp)} - ${fmtTs(cluster.endTimestamp)}`
    : fmtTs(cluster.startTimestamp);

  const trackIdStr =
    cluster.trackIds.length > 0
      ? cluster.trackIds.map((id) => `#${id}`).join(', ')
      : '—';

  const primarySnap = cluster.snapshots[0]
    ? `${BACKEND_URL}/${cluster.snapshots[0]}`
    : null;

  return (
    <>
      <tr
        className={cn(
          'transition-colors hover:bg-[#1E3048]/20',
          expanded && 'bg-[#1E3048]/10',
        )}
      >
        <td className="px-5 py-2.5 font-mono text-[#E8EDF5]">
          <div className="flex items-center gap-2">
            {hasMultiple && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="rounded p-0.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                {expanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            )}
            <span>{timeStr}</span>
            {hasMultiple && (
              <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold text-amber-400">
                {cluster.alerts.length} frames
              </span>
            )}
          </div>
        </td>
        <td className="px-3 py-2.5 text-[#5A7A9A]">{trackIdStr}</td>
        <td className="px-3 py-2.5">
          <SeverityBadge severity={cluster.maxSeverity} />
        </td>
        <td className="px-3 py-2.5">
          {primarySnap ? (
            <div className="relative inline-block">
              <button
                onClick={() => onSnapshotClick(primarySnap)}
                className="h-10 w-14 overflow-hidden rounded border border-[#1E3048] bg-black/40 transition-opacity hover:opacity-80"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={primarySnap}
                  alt="snapshot"
                  className="h-full w-full object-cover"
                />
              </button>
              {cluster.snapshots.length > 1 && (
                <span className="pointer-events-none absolute right-0.5 bottom-0.5 rounded bg-black/75 px-1 py-0.5 text-[8px] leading-none font-bold text-white">
                  +{cluster.snapshots.length - 1}f
                </span>
              )}
            </div>
          ) : (
            <div className="flex h-10 w-14 items-center justify-center rounded border border-[#1E3048] bg-[#0A0F1E]">
              <Info className="h-3.5 w-3.5 text-[#1E3048]" />
            </div>
          )}
        </td>
        <td className="px-3 py-2.5 font-mono text-[10px] text-[#5A7A9A]">
          {cluster.bboxes[0] ? `[${cluster.bboxes[0].join(', ')}]` : '—'}
          {cluster.bboxes.length > 1 && (
            <span className="ml-1 text-[9px] text-[#5A7A9A]/60">
              ({cluster.bboxes.length} boxes)
            </span>
          )}
        </td>
      </tr>

      {/* Expanded frame-by-frame detail rows */}
      {expanded && hasMultiple && (
        <>
          {cluster.alerts.map((a, idx) => {
            const snapUrl = a.snapshot_path
              ? `${BACKEND_URL}/${a.snapshot_path}`
              : null;
            return (
              <tr
                key={`child-${a.id}-${idx}`}
                className="border-l-2 border-amber-500/40 bg-[#0A0F1E]/30"
              >
                <td className="py-2 pr-5 pl-10 font-mono text-[#5A7A9A]">
                  {fmtTs(a.timestamp)}
                </td>
                <td className="px-3 py-2 text-[#5A7A9A]/80">
                  {a.track_id !== null ? `#${a.track_id}` : '—'}
                </td>
                <td className="px-3 py-2">
                  <SeverityBadge severity={a.severity} />
                </td>
                <td className="px-3 py-2">
                  {snapUrl ? (
                    <button
                      onClick={() => onSnapshotClick(snapUrl)}
                      className="h-8 w-11 overflow-hidden rounded border border-[#1E3048]/40 bg-black/40 transition-opacity hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={snapUrl}
                        alt="snapshot"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-8 w-11 items-center justify-center rounded border border-[#1E3048]/40 bg-[#0A0F1E]">
                      <Info className="h-3 text-[#1E3048]" />
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-[9px] text-[#5A7A9A]/75">
                  {a.bbox ? `[${a.bbox.join(', ')}]` : '—'}
                </td>
              </tr>
            );
          })}
        </>
      )}
    </>
  );
}

function DetectorAlertCard({
  activityType,
  count,
  alerts,
  onSnapshotClick,
}: {
  activityType: string;
  count: number;
  alerts: ActivityAlert[];
  onSnapshotClick: (url: string) => void;
}) {
  const [open, setOpen] = useState(count > 0);
  const meta = activityMeta(activityType);
  const Icon = meta.Icon;
  const hasAlerts = count > 0;

  // ── Cluster alerts within 3 seconds ──────────────────────────────────────
  const sorted = [...alerts].sort((a, b) => a.timestamp - b.timestamp);
  const clusters: AlertCluster[] = [];
  const threshold = 3.0;

  for (const a of sorted) {
    if (clusters.length === 0) {
      clusters.push({
        id: a.id,
        startTimestamp: a.timestamp,
        endTimestamp: a.timestamp,
        trackIds: a.track_id !== null ? [a.track_id] : [],
        maxSeverity: a.severity,
        snapshots: a.snapshot_path ? [a.snapshot_path] : [],
        bboxes: a.bbox ? [a.bbox] : [],
        alerts: [a],
      });
    } else {
      const last = clusters[clusters.length - 1];
      if (a.timestamp - last.endTimestamp <= threshold) {
        last.endTimestamp = a.timestamp;
        if (a.track_id !== null && !last.trackIds.includes(a.track_id)) {
          last.trackIds.push(a.track_id);
        }
        const severityPriority: Record<string, number> = {
          info: 1,
          warning: 2,
          critical: 3,
        };
        const aPri = severityPriority[a.severity] ?? 0;
        const lastPri = severityPriority[last.maxSeverity] ?? 0;
        if (aPri > lastPri) {
          last.maxSeverity = a.severity;
        }
        if (a.snapshot_path && !last.snapshots.includes(a.snapshot_path)) {
          last.snapshots.push(a.snapshot_path);
        }
        if (a.bbox) {
          last.bboxes.push(a.bbox);
        }
        last.alerts.push(a);
      } else {
        clusters.push({
          id: a.id,
          startTimestamp: a.timestamp,
          endTimestamp: a.timestamp,
          trackIds: a.track_id !== null ? [a.track_id] : [],
          maxSeverity: a.severity,
          snapshots: a.snapshot_path ? [a.snapshot_path] : [],
          bboxes: a.bbox ? [a.bbox] : [],
          alerts: [a],
        });
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
      {/* Card header — always visible, clickable to expand */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#1E3048]/30"
      >
        <div className="shrink-0 rounded-lg bg-[#1E3048] p-1.5">
          <Icon className={cn('h-3.5 w-3.5', meta.iconCls)} />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-[#E8EDF5]">
            {meta.label}
          </span>
        </div>
        {/* Count badge */}
        {hasAlerts ? (
          <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            {count} alert{count !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            No alerts
          </span>
        )}
        {/* Expand chevron */}
        <span className="shrink-0 text-[#5A7A9A]">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {/* Card body — alert table or clean-state message */}
      {open && (
        <div className="border-t border-[#1E3048]">
          {!hasAlerts ? (
            <div className="flex items-center gap-2 px-5 py-4">
              <span className="text-base">✅</span>
              <p className="text-xs font-medium text-emerald-400">
                No alerts detected — all clear for this detector.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1E3048] text-left text-[10px] font-semibold tracking-wider text-[#5A7A9A]">
                    <th className="px-5 py-2">Time</th>
                    <th className="px-3 py-2">Track ID</th>
                    <th className="px-3 py-2">Severity</th>
                    <th className="px-3 py-2">Snapshot</th>
                    <th className="px-3 py-2">Bounding Box</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3048]/60">
                  {clusters.map((c) => (
                    <ClusteredAlertRow
                      key={c.id}
                      cluster={c}
                      onSnapshotClick={onSnapshotClick}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smoking status config
// ─────────────────────────────────────────────────────────────────────────────

const SMOKING_STATUS_MAP: Record<
  string,
  { label: string; emoji: string; cls: string; dot: string }
> = {
  smoking_confirmed: {
    label: 'Smoking Confirmed',
    emoji: '🚬',
    cls: 'text-red-400 bg-red-400/10 border-red-400/20',
    dot: 'bg-red-400',
  },
  smoking_likely: {
    label: 'Smoking Likely',
    emoji: '⚠️',
    cls: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    dot: 'bg-amber-400',
  },
  holding: {
    label: 'Holding',
    emoji: '✋',
    cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    dot: 'bg-blue-400',
  },
  clean: {
    label: 'Clean',
    emoji: '✅',
    cls: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    dot: 'bg-emerald-400',
  },
};

function SmokingStatusBadge({ status }: { status: string }) {
  const s = SMOKING_STATUS_MAP[status] ?? SMOKING_STATUS_MAP.clean;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
        s.cls,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smoking event group card (extracted to obey Rules of Hooks)
// ─────────────────────────────────────────────────────────────────────────────

function SmokingEventGroup({
  status,
  group,
  onFrameClick,
}: {
  status: keyof typeof SMOKING_STATUS_MAP;
  group: SmokingEvent[];
  onFrameClick: (url: string) => void;
}) {
  const [open, setOpen] = useState(status === 'smoking_confirmed');
  const meta = SMOKING_STATUS_MAP[status];

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-[#1E3048]/30"
      >
        <span className="text-base">{meta.emoji}</span>
        <span className="flex-1 text-xs font-semibold text-[#E8EDF5]">
          {meta.label}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            meta.cls,
          )}
        >
          {group.length} event{group.length !== 1 ? 's' : ''}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#5A7A9A]" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]" />
        )}
      </button>

      {open && (
        <div className="overflow-x-auto border-t border-[#1E3048]">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1E3048] text-left text-[10px] font-semibold tracking-wider text-[#5A7A9A]">
                <th className="px-5 py-2">Time</th>
                <th className="px-3 py-2">Person</th>
                <th className="px-3 py-2">Score</th>
                <th className="px-3 py-2">Signals</th>
                <th className="px-3 py-2">Frame</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3048]/60">
              {group.map((e) => {
                const frameUrl = e.frame_path
                  ? `${BACKEND_URL}/${e.frame_path}`
                  : null;
                return (
                  <tr
                    key={e.id}
                    className="transition-colors hover:bg-[#1E3048]/20"
                  >
                    <td className="px-5 py-2.5 font-mono text-[#E8EDF5]">
                      {fmtTs(e.timestamp)}
                    </td>
                    <td className="px-3 py-2.5 text-[#5A7A9A]">
                      #{e.person_id}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          'font-mono font-bold',
                          e.score >= 80
                            ? 'text-red-400'
                            : e.score >= 50
                              ? 'text-amber-400'
                              : 'text-emerald-400',
                        )}
                      >
                        {e.score}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {e.cig_detected && (
                          <span className="rounded bg-amber-500/10 px-1 py-0.5 text-[9px] font-semibold text-amber-400">
                            CIG
                          </span>
                        )}
                        {e.tip_detected && (
                          <span className="rounded bg-red-500/10 px-1 py-0.5 text-[9px] font-semibold text-red-400">
                            TIP
                          </span>
                        )}
                        {e.smoke_detected && (
                          <span className="rounded bg-blue-500/10 px-1 py-0.5 text-[9px] font-semibold text-blue-400">
                            SMK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {frameUrl ? (
                        <button
                          onClick={() => onFrameClick(frameUrl)}
                          className="h-10 w-14 overflow-hidden rounded border border-[#1E3048] bg-black/40 transition-opacity hover:opacity-80"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={frameUrl}
                            alt="frame"
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        <div className="flex h-10 w-14 items-center justify-center rounded border border-[#1E3048] bg-[#0A0F1E]">
                          <Info className="h-3.5 w-3.5 text-[#1E3048]" />
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Smoking Results View
// ─────────────────────────────────────────────────────────────────────────────

function SmokingResultsView({
  setActiveTab,
}: {
  setActiveTab: (tab: ActivityTab) => void;
}) {
  const {
    viewedSmokingSession: smokingSession,
    viewedSmokingEvents: smokingEvents,
    smokingFilename,
  } = useActivityDetectionStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  if (!smokingSession) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
        <Flame className="h-8 w-8 text-[#1E3048]" />
        <p className="text-sm text-[#5A7A9A]">
          No results yet — upload and process a video first
        </p>
      </div>
    );
  }

  const confirmed = smokingEvents.filter(
    (e) => e.status === 'smoking_confirmed',
  ).length;
  const likely = smokingEvents.filter(
    (e) => e.status === 'smoking_likely',
  ).length;
  const holding = smokingEvents.filter((e) => e.status === 'holding').length;
  const clean = smokingEvents.filter((e) => e.status === 'clean').length;

  const maxTs =
    smokingEvents.length > 0
      ? Math.max(...smokingEvents.map((e) => e.timestamp))
      : 0;

  const outputUrl =
    smokingSession.status === 'completed'
      ? getAnnotatedVideoUrl(smokingSession.id)
      : null;

  const handleSeek = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.play().catch(() => {});
    }
  };

  const overallMeta =
    SMOKING_STATUS_MAP[smokingSession.overall_status ?? 'clean'] ??
    SMOKING_STATUS_MAP.clean;

  return (
    <div className="space-y-4">
      {/* Overall status banner */}
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl border p-5',
          overallMeta.cls,
        )}
      >
        <span className="text-4xl">{overallMeta.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#E8EDF5]">
            Overall verdict: {overallMeta.label}
          </p>
          {smokingFilename && (
            <p className="mt-0.5 truncate text-[11px] text-[#5A7A9A]">
              {smokingFilename}
            </p>
          )}
        </div>
        <SmokingStatusBadge status={smokingSession.overall_status ?? 'clean'} />
      </div>

      {/* 4-stat grid */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Total Events',
            value: smokingEvents.length,
            cls: 'text-[#E8EDF5]',
          },
          { label: 'Confirmed', value: confirmed, cls: 'text-red-400' },
          { label: 'Likely', value: likely, cls: 'text-amber-400' },
          { label: 'Holding', value: holding, cls: 'text-blue-400' },
        ].map(({ label, value, cls }) => (
          <div
            key={label}
            className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center"
          >
            <p className={cn('text-2xl font-bold', cls)}>{value}</p>
            <p className="mt-1 text-[10px] text-[#5A7A9A]">{label}</p>
          </div>
        ))}
      </div>

      {/* Annotated video */}
      {outputUrl && (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="flex items-center justify-between border-b border-[#1E3048] p-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span className="text-sm font-medium text-[#E8EDF5]">
                Annotated Video
              </span>
            </div>
            <span className="text-xs text-[#5A7A9A]">
              Click timeline to seek
            </span>
          </div>
          <div className="flex justify-center bg-black/40 p-4">
            <video
              ref={videoRef}
              src={outputUrl}
              controls
              className="max-h-[440px] w-full rounded-lg bg-black"
            />
          </div>
        </div>
      )}

      {/* Timeline strip */}
      {smokingEvents.length > 0 && maxTs > 0 && (
        <UnifiedAlertTimeline
          items={smokingEvents.map((e) => ({
            id: e.id,
            timestamp: e.timestamp,
            severity: e.status,
            tooltip: `${e.status.replace(/_/g, ' ')} (score: ${e.score})`,
          }))}
          maxTs={maxTs}
          onSeek={handleSeek}
        />
      )}

      {/* Event cards grouped by status — each is its own component to obey Rules of Hooks */}
      {(['smoking_confirmed', 'smoking_likely', 'holding', 'clean'] as const)
        .filter((status) => smokingEvents.some((e) => e.status === status))
        .map((status) => (
          <SmokingEventGroup
            key={status}
            status={status}
            group={smokingEvents.filter((e) => e.status === status)}
            onFrameClick={setModalSrc}
          />
        ))}

      {/* Clean state */}
      {smokingEvents.length === 0 && smokingSession.status === 'completed' && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-400">
              All clear — no events detected
            </p>
            <p className="text-xs text-[#5A7A9A]">
              No smoking-related signals were found in this video.
            </p>
          </div>
        </div>
      )}

      {/* History shortcut */}
      <button
        onClick={() => setActiveTab('history')}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1E3048] py-2.5 text-xs font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
      >
        <History className="h-3.5 w-3.5" />
        View All Past Media
      </button>

      {/* Snapshot modal */}
      {modalSrc && (
        <SnapshotModal src={modalSrc} onClose={() => setModalSrc(null)} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main ResultsTab
// ─────────────────────────────────────────────────────────────────────────────

export function ResultsTab() {
  const {
    jobFlavor,
    viewedStatus: processStatus,
    viewedAlerts: alerts,
    viewedSummary: summary,
    viewedMedia: uploadedMedia,
    mediaType,
    setActiveTab,
  } = useActivityDetectionStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  // ── Smoking flavor — delegate entirely to SmokingResultsView ───────────────
  if (jobFlavor === 'smoking') {
    return <SmokingResultsView setActiveTab={setActiveTab} />;
  }

  const maxTs =
    alerts.length > 0 ? Math.max(...alerts.map((a) => a.timestamp)) : 0;
  const outputUrl = processStatus?.output_filepath
    ? `${BACKEND_URL}/${processStatus.output_filepath}`
    : null;

  const activeMediaType = uploadedMedia?.media_type ?? mediaType;

  const handleSeek = (t: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = t;
      videoRef.current.play().catch(() => {});
    }
  };

  if (!processStatus) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
        <Film className="h-8 w-8 text-[#1E3048]" />
        <p className="text-sm text-[#5A7A9A]">
          No results yet — upload and process a file first
        </p>
      </div>
    );
  }

  // ── Derive detector cards from summary.by_type keys ──────────────────────
  // All keys present in by_type represent detectors that were run.
  // We group actual alerts by activity_type for the card bodies.
  const alertsByType: Record<string, ActivityAlert[]> = {};
  alerts.forEach((a) => {
    if (!alertsByType[a.activity_type]) alertsByType[a.activity_type] = [];
    alertsByType[a.activity_type].push(a);
  });

  // The canonical detector list comes from the summary; fall back to alerts if summary unavailable
  const detectorKeys: string[] = summary?.by_type
    ? Object.keys(summary.by_type)
    : Object.keys(alertsByType);

  return (
    <div className="space-y-4">
      {/* ── Summary bar ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        {summary ? (
          <div className="flex flex-wrap items-center gap-4">
            {/* Total count */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-[#E8EDF5]">
                {summary.total_alerts}
              </span>
              <span className="text-xs text-[#5A7A9A]">total alerts</span>
            </div>

            <div className="h-8 w-px bg-[#1E3048]" />

            {/* Severity pills */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                {
                  key: 'critical',
                  label: 'Critical',
                  cls: 'text-red-400 bg-red-400/10 border border-red-400/20',
                  dot: 'bg-red-400',
                },
                {
                  key: 'warning',
                  label: 'Warning',
                  cls: 'text-amber-400 bg-amber-400/10 border border-amber-400/20',
                  dot: 'bg-amber-400',
                },
                {
                  key: 'info',
                  label: 'Info',
                  cls: 'text-blue-400 bg-blue-400/10 border border-blue-400/20',
                  dot: 'bg-blue-400',
                },
              ].map(({ key, label, cls, dot }) => (
                <span
                  key={key}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                    cls,
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
                  {summary.by_severity[key] ?? 0} {label}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Summary unavailable fallback */
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-[#E8EDF5]">
              {alerts.length}
            </span>
            <span className="text-xs text-[#5A7A9A]">
              alerts detected
              <span className="ml-2 text-[10px] text-[#5A7A9A]/60 italic">
                (summary unavailable)
              </span>
            </span>
          </div>
        )}
      </div>

      {/* ── Video output ──────────────────────────────────────────────────── */}
      {activeMediaType === 'video' && (
        <>
          {outputUrl ? (
            <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <div className="flex items-center justify-between border-b border-[#1E3048] p-4">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-[#E8EDF5]">
                    Annotated Video
                  </span>
                </div>
                <span className="text-xs text-[#5A7A9A]">
                  Click timeline to seek
                </span>
              </div>
              <div className="flex justify-center bg-black/40 p-4">
                <video
                  ref={videoRef}
                  src={outputUrl}
                  controls
                  className="max-h-[440px] w-full rounded-lg bg-black"
                />
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
              <p className="text-sm text-[#5A7A9A]">
                Annotated video not yet available
              </p>
            </div>
          )}
          <UnifiedAlertTimeline
            items={alerts.map((a) => ({
              id: a.id,
              timestamp: a.timestamp,
              severity: a.severity,
              tooltip: `${a.activity_type.replace(/_/g, ' ')} (${a.severity})`,
            }))}
            maxTs={maxTs}
            onSeek={handleSeek}
          />
        </>
      )}

      {/* ── Photo output ──────────────────────────────────────────────────── */}
      {activeMediaType === 'photo' && outputUrl && (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="flex items-center gap-2 border-b border-[#1E3048] p-4">
            <Film className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-[#E8EDF5]">
              Annotated Output
            </span>
          </div>
          <div className="flex justify-center bg-black/40 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={outputUrl}
              alt="Annotated output"
              className="max-h-[440px] rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* ── Per-detector grouped collapsible cards ────────────────────────── */}
      {detectorKeys.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
            Results by Detector
          </p>
          {detectorKeys.map((type) => {
            const count =
              summary?.by_type[type] ?? alertsByType[type]?.length ?? 0;
            const typeAlerts = alertsByType[type] ?? [];
            return (
              <DetectorAlertCard
                key={type}
                activityType={type}
                count={count}
                alerts={typeAlerts}
                onSnapshotClick={setModalSrc}
              />
            );
          })}
        </div>
      )}

      {/* ── No-results clean state ────────────────────────────────────────── */}
      {detectorKeys.length === 0 &&
        alerts.length === 0 &&
        processStatus.status === 'completed' && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-4">
            <span className="text-xl">✅</span>
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                All clear — no alerts detected
              </p>
              <p className="text-xs text-[#5A7A9A]">
                The AI found no matching activity in this media.
              </p>
            </div>
          </div>
        )}

      {/* ── History shortcut ──────────────────────────────────────────────── */}
      <button
        onClick={() => setActiveTab('history')}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#1E3048] py-2.5 text-xs font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
      >
        <History className="h-3.5 w-3.5" />
        View All Past Media
      </button>

      {/* ── Snapshot modal ────────────────────────────────────────────────── */}
      {modalSrc && (
        <SnapshotModal src={modalSrc} onClose={() => setModalSrc(null)} />
      )}
    </div>
  );
}

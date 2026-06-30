'use client';

import { useRef, useState } from 'react';
import { Video, Film, X, AlertTriangle, Info, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import type { ActivityAlert } from '@/types/activity';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

function fmtTs(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

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

/** Mini alert timeline strip */
function AlertTimeline({
  alerts,
  maxTs,
  onSeek,
}: {
  alerts: ActivityAlert[];
  maxTs: number;
  onSeek: (t: number) => void;
}) {
  if (alerts.length === 0 || maxTs === 0) return null;
  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
      <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
        Alert Timeline — click to seek
      </p>
      <div className="relative h-2 rounded-full bg-[#1E3048]">
        {alerts.map((a) => {
          const pct = Math.min(Math.max((a.timestamp / maxTs) * 100, 1), 99);
          const sev = SEVERITY_MAP[a.severity] ?? SEVERITY_MAP.info;
          return (
            <button
              key={a.id}
              title={`${fmtTs(a.timestamp)} · ${a.activity_type} · ${a.severity}`}
              onClick={() => onSeek(a.timestamp)}
              style={{ left: `${pct}%` }}
              className={cn(
                'absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0D1628] transition-transform hover:scale-125',
                sev.dot,
                a.severity === 'critical' && 'animate-pulse',
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

/** Snapshot modal */
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

export function ResultsTab() {
  const { processStatus, alerts, uploadedMedia, mediaType, setActiveTab } =
    useActivityDetectionStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [modalSrc, setModalSrc] = useState<string | null>(null);

  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const warning = alerts.filter((a) => a.severity === 'warning').length;
  const info = alerts.filter((a) => a.severity === 'info').length;
  const maxTs =
    alerts.length > 0 ? Math.max(...alerts.map((a) => a.timestamp)) : 0;

  const outputUrl = processStatus?.output_filepath
    ? `${BACKEND_URL}/${processStatus.output_filepath}`
    : null;

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

  return (
    <div className="space-y-4">
      {/* Severity summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: alerts.length, cls: 'text-[#E8EDF5]' },
          { label: 'Critical', value: critical, cls: 'text-red-400' },
          { label: 'Warning', value: warning, cls: 'text-amber-400' },
          { label: 'Info', value: info, cls: 'text-blue-400' },
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

      {/* Video output */}
      {mediaType === 'video' && (
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
          {/* Timeline */}
          <AlertTimeline alerts={alerts} maxTs={maxTs} onSeek={handleSeek} />
        </>
      )}

      {/* Photo output */}
      {mediaType === 'photo' && outputUrl && (
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

      {/* Alert table */}
      {alerts.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="border-b border-[#1E3048] px-5 py-3">
            <p className="text-xs font-semibold text-[#5A7A9A]">
              Detected Alerts ({alerts.length})
            </p>
          </div>
          <div className="divide-y divide-[#1E3048]">
            {alerts.map((a) => {
              const snapUrl = a.snapshot_path
                ? `${BACKEND_URL}/${a.snapshot_path}`
                : null;
              return (
                <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                  {/* Snapshot thumbnail */}
                  {snapUrl ? (
                    <button
                      onClick={() => setModalSrc(snapUrl)}
                      className="h-12 w-16 shrink-0 overflow-hidden rounded-md border border-[#1E3048] bg-black/40 transition-opacity hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={snapUrl}
                        alt="snapshot"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="flex h-12 w-16 shrink-0 items-center justify-center rounded-md border border-[#1E3048] bg-[#0A0F1E]">
                      <Info className="h-4 w-4 text-[#1E3048]" />
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#E8EDF5] capitalize">
                      {a.activity_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {a.track_id !== null ? `Track #${a.track_id} · ` : ''}
                      {fmtTs(a.timestamp)}
                    </p>
                  </div>

                  <SeverityBadge severity={a.severity} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {alerts.length === 0 && processStatus.status === 'completed' && (
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

'use client';

import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import { getDetectorDef } from './ActivityDetectorSidebar';

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.round(diff)}s ago`;
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
  return `${Math.round(diff / 3600)}h ago`;
}

export function ProcessingTab() {
  const {
    jobFlavor,
    processStatus,
    uploadedMedia,
    smokingSession,
    smokingFilename,
    selectedDetector,
    setActiveTab,
  } = useActivityDetectionStore();
  const det = getDetectorDef(selectedDetector);

  const isSmoking = jobFlavor === 'smoking';
  const status = isSmoking
    ? (smokingSession?.status ?? 'pending')
    : (processStatus?.status ?? 'pending');

  const filename = isSmoking
    ? (smokingFilename ?? 'Smoking Session')
    : (uploadedMedia?.filename ?? '');

  const mediaId = isSmoking
    ? (smokingSession?.id ?? '')
    : (uploadedMedia?.id ?? '');

  const createdAt = isSmoking
    ? smokingSession?.created_at
    : uploadedMedia?.created_at;

  const displayMediaType = isSmoking
    ? 'video'
    : (uploadedMedia?.media_type ?? 'video');

  const isRunning = status === 'pending' || status === 'processing';

  const STATUS_MAP: Record<
    string,
    { label: string; cls: string; Icon: React.ElementType }
  > = {
    pending: {
      label: 'Queued',
      cls: 'text-amber-400 bg-amber-400/10',
      Icon: Clock,
    },
    processing: {
      label: 'Processing',
      cls: 'text-blue-400 bg-blue-400/10',
      Icon: Loader2,
    },
    completed: {
      label: 'Completed',
      cls: 'text-emerald-400 bg-emerald-400/10',
      Icon: CheckCircle2,
    },
    failed: {
      label: 'Failed',
      cls: 'text-red-400 bg-red-400/10',
      Icon: AlertCircle,
    },
  };

  const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.pending;
  const StatusIcon = statusInfo.Icon;

  const MSG = {
    pending: {
      emoji: '🔍',
      heading: 'Your media is queued for analysis…',
      sub: 'Waiting for a worker to pick up the job.',
    },
    processing: {
      emoji: '⚙️',
      heading: 'Scanning footage frame by frame…',
      sub: 'The AI is inspecting each sampled frame. Usually 30–90 seconds.',
    },
    completed: {
      emoji: '✅',
      heading: 'Analysis complete',
      sub: 'All detected alerts have been saved. Click View Results.',
    },
    failed: {
      emoji: '⚠️',
      heading: 'Analysis encountered an error',
      sub: 'Something went wrong. Go back to Configure and re-try.',
    },
  };
  const msg = MSG[status] ?? MSG.pending;

  return (
    <div className="space-y-4">
      {/* Main status card */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          {isRunning ? (
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-blue-500/20" />
              <div className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
              <Activity className="h-6 w-6 text-blue-400" />
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
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              statusInfo.cls,
            )}
          >
            <StatusIcon
              className={cn(
                'h-3 w-3',
                status === 'processing' && 'animate-spin',
              )}
            />
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Media info */}
      {mediaId && (
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
          <p className="mb-3 text-[10px] font-semibold tracking-widest text-[#5A7A9A] uppercase">
            Job Info
          </p>
          <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            {[
              {
                label: 'Detector',
                value: (
                  <span className={cn('font-semibold', det.accentText)}>
                    {det.label}
                  </span>
                ),
              },
              {
                label: 'File',
                value: (
                  <span className="truncate font-medium text-[#E8EDF5]">
                    {filename}
                  </span>
                ),
              },
              {
                label: 'Type',
                value: (
                  <span className="text-[#E8EDF5] capitalize">
                    {displayMediaType}
                  </span>
                ),
              },
              {
                label: 'Submitted',
                value: (
                  <span className="text-[#E8EDF5]">
                    {createdAt ? timeAgo(createdAt) : '—'}
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
            Media ID: <span className="font-mono">{mediaId}</span>
          </p>
        </div>
      )}

      {/* Polling note */}
      {isRunning && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#1E3048] bg-[#0A0F1E] px-4 py-3">
          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-blue-400" />
          <p className="text-xs text-[#5A7A9A]">
            Auto-checking every 10 seconds. You can switch tabs — we&apos;ll
            notify you when it&apos;s done.
          </p>
        </div>
      )}

      {/* View results */}
      {status === 'completed' && (
        <button
          onClick={() => setActiveTab('results')}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-semibold text-white transition-all hover:bg-amber-400"
        >
          <ChevronRight className="h-4 w-4" />
          View Results
        </button>
      )}
    </div>
  );
}

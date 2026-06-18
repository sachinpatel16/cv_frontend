'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  LayoutList,
  TimerIcon,
  FileJson,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAnalysis } from '@/features/analyses/registry';
import type {
  AnalysisId,
  ResultComponentProps,
} from '@/features/analyses/types';

// ── Tab definitions ───────────────────────────────────────────────────────────

type ResultTab = 'results' | 'timeline' | 'raw';

const TABS: { id: ResultTab; label: string; icon: React.ElementType }[] = [
  { id: 'results', label: 'Results', icon: LayoutList },
  { id: 'timeline', label: 'Timeline', icon: TimerIcon },
  { id: 'raw', label: 'Raw Matches', icon: FileJson },
];

// ── Status badge ──────────────────────────────────────────────────────────────

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<
    string,
    { color: string; icon: React.ElementType; animate?: boolean }
  > = {
    completed: {
      color: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle2,
    },
    pending: { color: 'text-[#F59E0B] bg-[#F59E0B]/10', icon: Clock },
    processing: {
      color: 'text-[#60A5FA] bg-[#60A5FA]/10',
      icon: Loader2,
      animate: true,
    },
    failed: { color: 'text-red-400 bg-red-400/10', icon: AlertCircle },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.color}`}
    >
      <Icon className={cn('h-3.5 w-3.5', s.animate && 'animate-spin')} />
      <span className="capitalize">{status}</span>
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResultShellProps {
  /** Which analysis produced these results. */
  analysisId: AnalysisId;
  /** The session/job ID for this investigation. */
  sessionId: string;
  /** Current job status — drives the status badge and polling UI. */
  jobStatus: 'pending' | 'processing' | 'completed' | 'failed';
  /** Optional callback to poll for status updates. Called on mount if status is not terminal. */
  onPoll?: () => void;
  /** Polling interval in ms (default: 3000). */
  pollIntervalMs?: number;
  /** Optional export handler. Shows the export button when defined. */
  onExport?: () => void;
  /** The main content — typically the analysis-specific ResultComponent. */
  children: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResultShell({
  analysisId,
  sessionId,
  jobStatus,
  onPoll,
  pollIntervalMs = 3000,
  onExport,
  children,
}: ResultShellProps) {
  const router = useRouter();
  const config = getAnalysis(analysisId);
  const [activeTab, setActiveTab] = useState<ResultTab>('results');

  // ── Auto-poll until terminal status ──
  const isTerminal = jobStatus === 'completed' || jobStatus === 'failed';

  const pollFn = useCallback(() => {
    if (onPoll && !isTerminal) onPoll();
  }, [onPoll, isTerminal]);

  useEffect(() => {
    if (isTerminal || !onPoll) return;

    const interval = setInterval(pollFn, pollIntervalMs);
    // Also run immediately on mount
    pollFn();

    return () => clearInterval(interval);
  }, [pollFn, pollIntervalMs, isTerminal, onPoll]);

  const AnalysisIcon = config?.icon;

  return (
    <div className="max-w-6xl space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/investigations/new')}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#1E3048] bg-[#0D1628] text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          title="Back to Investigations"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="flex flex-1 items-center gap-3">
          {AnalysisIcon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <AnalysisIcon className="h-4.5 w-4.5 text-[#60A5FA]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-[#E8EDF5]">
              {config?.label ?? 'Analysis'} Results
            </h1>
            <p className="mt-0.5 truncate text-xs text-[#5A7A9A]">
              Session {sessionId.slice(0, 8)}…
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <JobStatusBadge status={jobStatus} />

          {onExport && (
            <button
              onClick={onExport}
              disabled={!isTerminal}
              className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:pointer-events-none disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-[#1565C0] text-white'
                : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Processing overlay ── */}
      {!isTerminal && (
        <div className="flex items-center gap-3 rounded-xl border border-[#1565C0]/20 bg-[#1565C0]/5 px-5 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#60A5FA]" />
          <div>
            <p className="text-sm font-medium text-[#E8EDF5]">
              Analysis in progress…
            </p>
            <p className="mt-0.5 text-xs text-[#5A7A9A]">
              Results will appear automatically as they become available.
            </p>
          </div>
        </div>
      )}

      {/* ── Main content area ── */}
      <div data-tab={activeTab}>{children}</div>
    </div>
  );
}

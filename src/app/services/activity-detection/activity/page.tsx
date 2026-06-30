'use client';

import { useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import { ActivityNavTabs } from './components/ActivityNavTabs';
import { ActivityDetectorSidebar } from './components/ActivityDetectorSidebar';
import { MediaTab } from './components/MediaTab';
import { ConfigureTab } from './components/ConfigureTab';
import { ProcessingTab } from './components/ProcessingTab';
import { ResultsTab } from './components/ResultsTab';
import { HistoryTab } from './components/HistoryTab';

const POLL_MS = 10_000;

export default function ActivityPage() {
  const { activeTab, processStatus, pollStatus, uploadedMedia, reset } =
    useActivityDetectionStore();

  // ── 10-second polling ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!uploadedMedia) return;
    const s = processStatus?.status;
    if (s === 'completed' || s === 'failed') return;
    if (!processStatus) return; // not started yet

    const timer = setInterval(() => pollStatus(), POLL_MS);
    return () => clearInterval(timer);
  }, [processStatus, uploadedMedia, pollStatus]);

  return (
    <div className="max-w-7xl space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            Human Activity Detection
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            AI-powered behavioural analysis — detect falls, fights, trespassing,
            loitering and more.
          </p>
        </div>
        {uploadedMedia && (
          <button
            onClick={reset}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-red-400/30 hover:text-red-400"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            New Analysis
          </button>
        )}
      </div>

      {/* ── Tab navigation ── */}
      <ActivityNavTabs />

      {/* ── Body: sidebar + content ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* Left sidebar — detector selector */}
        <ActivityDetectorSidebar />

        {/* Right — tab content */}
        <div className="min-w-0 space-y-4">
          {activeTab === 'media' && <MediaTab />}
          {activeTab === 'configure' && <ConfigureTab />}
          {activeTab === 'processing' && <ProcessingTab />}
          {activeTab === 'results' && <ResultsTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </div>
  );
}

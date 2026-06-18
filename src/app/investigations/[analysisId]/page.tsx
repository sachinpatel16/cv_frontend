'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getAnalysis } from '@/features/analyses/registry';
import { ResultShell } from '@/features/analyses/shared/ResultShell';
import type { AnalysisId } from '@/features/analyses/types';

export default function InvestigationResultsPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const analysisId = params.analysisId as AnalysisId;
  const sessionId = searchParams.get('sessionId');

  const config = getAnalysis(analysisId);

  // ── Job status polling state ──
  // The ResultComponent is responsible for fetching actual data;
  // ResultShell handles the status display and polling chrome.
  const [jobStatus, setJobStatus] = useState<
    'pending' | 'processing' | 'completed' | 'failed'
  >('completed');

  const handlePoll = useCallback(() => {
    // Polling is delegated to the ResultComponent via its own logic.
    // This handler can be extended to call a generic /analyses/status endpoint
    // once the backend exposes one.
  }, []);

  // ── Guard: unknown analysis ──
  if (!config) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#E8EDF5]">
              Analysis Not Found
            </h1>
            <p className="mt-1 text-sm text-[#5A7A9A]">
              The analysis type &ldquo;{analysisId}&rdquo; is not registered. It
              may not be available yet.
            </p>
          </div>
          <Link
            href="/investigations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1565C0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
          >
            <ArrowLeft className="h-4 w-4" />
            New Investigation
          </Link>
        </div>
      </div>
    );
  }

  // ── Guard: missing session ID ──
  if (!sessionId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/10">
            <AlertCircle className="h-8 w-8 text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#E8EDF5]">No Session ID</h1>
            <p className="mt-1 text-sm text-[#5A7A9A]">
              A session ID is required to view results. Start a new
              investigation to create one.
            </p>
          </div>
          <Link
            href="/investigations/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#1565C0] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
          >
            <ArrowLeft className="h-4 w-4" />
            New Investigation
          </Link>
        </div>
      </div>
    );
  }

  const ResultComponent = config.ResultComponent;

  return (
    <ResultShell
      analysisId={analysisId}
      sessionId={sessionId}
      jobStatus={jobStatus}
      onPoll={handlePoll}
    >
      <ResultComponent sessionId={sessionId} analysisId={analysisId} />
    </ResultShell>
  );
}

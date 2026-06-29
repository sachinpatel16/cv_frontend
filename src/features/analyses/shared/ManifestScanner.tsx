'use client';

import { useState, useMemo } from 'react';
import { Sparkles, ChevronRight, Lock, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllAnalyses } from '@/features/analyses/registry';
import type { AnalysisId, AnalysisConfig } from '@/features/analyses/types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface ManifestScannerProps {
  /** Number of media files selected (displayed in the scanning UI). */
  mediaCount: number;
  /** Called when the user picks an analysis to configure. */
  onSelect: (analysisId: AnalysisId) => void;
}

// ── Category labels & ordering ────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  search: 'Search & Recognition',
  counting: 'Counting & Tracking',
  detection: 'Detection & Alerts',
  'zone-based': 'Zone-Based Analysis',
};

const CATEGORY_ORDER = ['search', 'counting', 'detection', 'zone-based'];

// ── Component ─────────────────────────────────────────────────────────────────

export function ManifestScanner({
  mediaCount,
  onSelect,
}: ManifestScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const analyses = useMemo(() => getAllAnalyses(), []);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, AnalysisConfig[]> = {};
    for (const a of analyses) {
      if (!groups[a.category]) groups[a.category] = [];
      groups[a.category].push(a);
    }
    return groups;
  }, [analyses]);

  // Simulate scanning (will be replaced with POST /analyses/discover)
  function handleScan() {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setScanned(true);
    }, 1200);
  }

  // ── Pre-scan state ──
  if (!scanned) {
    return (
      <div className="space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-4 rounded-xl border border-[#1565C0]/20 bg-[#1565C0]/5 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#1565C0]/20 bg-[#1565C0]/10">
            <Sparkles className="h-5 w-5 text-[#60A5FA]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E8EDF5]">
              Discover Available Analyses
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#5A7A9A]">
              We&apos;ll scan your selected{' '}
              <span className="font-semibold text-[#E8EDF5]">
                {mediaCount} media file{mediaCount !== 1 ? 's' : ''}
              </span>{' '}
              to determine which video analysis capabilities are available. This
              helps surface the most relevant analyses for your content.
            </p>
          </div>
        </div>

        {/* Scan button */}
        <button
          onClick={handleScan}
          disabled={scanning}
          className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#1565C0] text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]/90 disabled:opacity-60"
        >
          {scanning ? (
            <>
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Scanning media manifest…
            </>
          ) : (
            <>
              <Search className="h-4.5 w-4.5" />
              Scan for Available Analyses
            </>
          )}
        </button>
      </div>
    );
  }

  // ── Post-scan: show analysis cards ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[#E8EDF5]">
            Available Analyses
          </h2>
          <p className="mt-0.5 text-xs text-[#5A7A9A]">
            {analyses.filter((a) => a.backendReady).length} of {analyses.length}{' '}
            analyses ready for your media
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
          Scan complete
        </span>
      </div>

      {/* Cards grouped by category */}
      {CATEGORY_ORDER.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;

        return (
          <div key={cat} className="space-y-3">
            <p className="px-1 text-[10px] font-semibold tracking-widest text-[#5A7A9A]/60 uppercase">
              {CATEGORY_LABELS[cat] ?? cat}
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {items.map((analysis) => (
                <AnalysisCard
                  key={analysis.id}
                  analysis={analysis}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Analysis card ─────────────────────────────────────────────────────────────

function AnalysisCard({
  analysis,
  onSelect,
}: {
  analysis: AnalysisConfig;
  onSelect: (id: AnalysisId) => void;
}) {
  const Icon = analysis.icon;
  const ready = analysis.backendReady;

  return (
    <button
      onClick={() => ready && onSelect(analysis.id)}
      disabled={!ready}
      className={cn(
        'group relative flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-200',
        ready
          ? 'border-[#1E3048] bg-[#0D1628] hover:border-[#1565C0]/50 hover:bg-[#0D1628]/80 hover:shadow-lg hover:shadow-[#1565C0]/5'
          : 'cursor-not-allowed border-[#1E3048]/50 bg-[#0A0F1E]/50 opacity-60',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
          ready
            ? 'border-[#1565C0]/20 bg-[#1565C0]/10 group-hover:border-[#1565C0]/40'
            : 'border-[#1E3048] bg-[#1E3048]/50',
        )}
      >
        <Icon
          className={cn('h-5 w-5', ready ? 'text-[#60A5FA]' : 'text-[#5A7A9A]')}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-semibold',
              ready ? 'text-[#E8EDF5]' : 'text-[#5A7A9A]',
            )}
          >
            {analysis.label}
          </p>
          {!ready && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-semibold text-[#F59E0B]">
              <Lock className="h-2.5 w-2.5" />
              Coming Soon
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-[#5A7A9A]">
          {analysis.description}
        </p>
      </div>

      {/* Arrow */}
      {ready && (
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#5A7A9A]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#60A5FA]" />
      )}
    </button>
  );
}

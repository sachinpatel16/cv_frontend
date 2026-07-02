'use client';

import { useEffect } from 'react';
import {
  RefreshCw,
  Film,
  ImageIcon,
  Loader2,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import type { ActivityDetectorId } from '@/stores/activityDetectionStore';
import { getDetectorDef } from './ActivityDetectorSidebar';
import type { UnifiedHistoryItem } from '@/types/activity';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

const STATUS_ICON: Record<string, { Icon: React.ElementType; cls: string }> = {
  pending: { Icon: Clock, cls: 'text-amber-400' },
  processing: { Icon: Loader2, cls: 'text-blue-400' },
  completed: { Icon: CheckCircle2, cls: 'text-emerald-400' },
  failed: { Icon: AlertCircle, cls: 'text-red-400' },
};

const SMOKING_OVERALL_CLS: Record<string, string> = {
  smoking_confirmed: 'text-red-400 bg-red-400/10',
  smoking_likely: 'text-amber-400 bg-amber-400/10',
  holding: 'text-blue-400 bg-blue-400/10',
  clean: 'text-emerald-400 bg-emerald-400/10',
};

const SMOKING_OVERALL_LABEL: Record<string, string> = {
  smoking_confirmed: '🚬 Confirmed',
  smoking_likely: '⚠️ Likely',
  holding: '✋ Holding',
  clean: '✅ Clean',
};

export function HistoryTab() {
  const {
    unifiedHistory,
    historyLoading,
    fetchHistory,
    loadHistoryItem,
    removeMedia,
  } = useActivityDetectionStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getDetectorForConfig = (
    item: UnifiedHistoryItem,
  ): ActivityDetectorId | null => {
    if (item.flavor === 'smoking') return 'smoking';
    const c = item.config;
    if (!c) return null;
    if (c.detect_fall) return 'fall';
    if (c.detect_aggression) return 'fighting';
    if (c.detect_intrusion) return 'trespassing';
    if (c.detect_loitering) return 'loitering';
    if (c.detect_occupancy) return 'occupancy';
    if (c.detect_sleeping) return 'sleeping';
    if (c.detect_walking) return 'walking';

    if (c.selected_activities) {
      if (
        c.selected_activities.includes('answer phone') ||
        c.selected_activities.includes('text on/look at a cellphone')
      ) {
        return 'mobile_phone';
      }
      if (c.selected_activities.includes('sit')) {
        return 'sitting';
      }
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#E8EDF5]">
          Past Analyses ({unifiedHistory.length})
        </p>
        <button
          onClick={fetchHistory}
          disabled={historyLoading}
          className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
        >
          <RefreshCw
            className={cn('h-3 w-3', historyLoading && 'animate-spin')}
          />
          Refresh
        </button>
      </div>

      {/* Content */}
      {historyLoading && unifiedHistory.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
        </div>
      ) : unifiedHistory.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
          <Film className="h-8 w-8 text-[#1E3048]" />
          <p className="text-sm text-[#5A7A9A]">No analyses uploaded yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="divide-y divide-[#1E3048]">
            {unifiedHistory.map((item: UnifiedHistoryItem) => {
              const { Icon: SIcon, cls: sCls } =
                STATUS_ICON[item.status] ?? STATUS_ICON.pending;
              const isSmoking = item.flavor === 'smoking';

              const detectorId = getDetectorForConfig(item);
              const det = detectorId ? getDetectorDef(detectorId) : null;
              const Icon = det
                ? det.Icon
                : item.media_type === 'video'
                  ? Film
                  : ImageIcon;

              return (
                <div
                  key={`${item.flavor}-${item.id}`}
                  className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#1E3048]/30"
                >
                  {/* Type icon with custom detector accent colors */}
                  <div
                    className={cn(
                      'shrink-0 rounded-lg border p-2 transition-colors',
                      det
                        ? `${det.accentBg} ${det.accentBorder}`
                        : 'border-transparent bg-[#1E3048]',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 transition-colors',
                        det ? det.accentText : 'text-[#5A7A9A]',
                      )}
                    />
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-medium text-[#E8EDF5]">
                        {item.displayName}
                      </p>
                      {/* Flavor badge */}
                      <span
                        className={cn(
                          'shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold',
                          isSmoking
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-[#1E3048] text-[#5A7A9A]',
                        )}
                      >
                        {isSmoking ? 'Smoking' : 'Activity'}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {fmtDate(item.created_at)}
                    </p>
                    {/* Smoking overall_status */}
                    {isSmoking && item.overall_status && (
                      <span
                        className={cn(
                          'mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold',
                          SMOKING_OVERALL_CLS[item.overall_status] ??
                            SMOKING_OVERALL_CLS.clean,
                        )}
                      >
                        {SMOKING_OVERALL_LABEL[item.overall_status] ??
                          item.overall_status}
                      </span>
                    )}
                  </div>

                  {/* Status icon */}
                  <SIcon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      sCls,
                      item.status === 'processing' && 'animate-spin',
                    )}
                  />

                  {/* Actions */}
                  <div className="flex w-[140px] shrink-0 items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {item.status === 'completed' && (
                      <button
                        onClick={() => loadHistoryItem(item)}
                        className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/20"
                      >
                        Load Results
                      </button>
                    )}
                    {/* Support delete for both smoking and activity items */}
                    <button
                      onClick={() => removeMedia(item.id)}
                      className="rounded-md p-1.5 text-[#5A7A9A] hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

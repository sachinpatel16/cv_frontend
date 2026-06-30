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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActivityDetectionStore } from '@/stores/activityDetectionStore';
import type { ActivityMedia } from '@/types/activity';

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

export function HistoryTab() {
  const {
    historyMedia,
    historyLoading,
    fetchHistory,
    loadHistoryItem,
    removeMedia,
  } = useActivityDetectionStore();

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#E8EDF5]">
          Past Media ({historyMedia.length})
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
      {historyLoading && historyMedia.length === 0 ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
        </div>
      ) : historyMedia.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]">
          <Film className="h-8 w-8 text-[#1E3048]" />
          <p className="text-sm text-[#5A7A9A]">No media uploaded yet</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="divide-y divide-[#1E3048]">
            {historyMedia.map((media: ActivityMedia) => {
              const { Icon: SIcon, cls: sCls } =
                STATUS_ICON[media.status] ?? STATUS_ICON.pending;
              return (
                <div
                  key={media.id}
                  className="group flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[#1E3048]/30"
                >
                  {/* Media type icon */}
                  <div className="shrink-0 rounded-lg bg-[#1E3048] p-2">
                    {media.media_type === 'video' ? (
                      <Film className="h-4 w-4 text-[#5A7A9A]" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-[#5A7A9A]" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[#E8EDF5]">
                      {media.filename}
                    </p>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {fmtDate(media.created_at)}
                    </p>
                  </div>

                  {/* Status */}
                  <SIcon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      sCls,
                      media.status === 'processing' && 'animate-spin',
                    )}
                  />

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    {media.status === 'completed' && (
                      <button
                        onClick={() => loadHistoryItem(media)}
                        className="rounded-md bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-400 hover:bg-amber-500/20"
                      >
                        Load Results
                      </button>
                    )}
                    <button
                      onClick={() => removeMedia(media.id)}
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

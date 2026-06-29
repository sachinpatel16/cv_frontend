import React from 'react';
import {
  History,
  RotateCcw,
  X,
  Video,
  Users,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { formatDate } from './utils';
import type { AnalyticsSession } from '@/types/peopleanalytics';

export function HistoryDrawer({
  open,
  sessions,
  loading,
  onClose,
  onRefresh,
  onSelectSession,
  title,
}: {
  open: boolean;
  sessions: AnalyticsSession[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelectSession: (s: AnalyticsSession) => void;
  title: string;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <History className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">{title}</p>
              <p className="text-[10px] text-[#5A7A9A]">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
              title="Refresh"
            >
              <RotateCcw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
                <History className="h-6 w-6 text-[#5A7A9A]/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#E8EDF5]">
                  No sessions yet
                </p>
                <p className="mt-0.5 text-xs text-[#5A7A9A]">
                  Process a video to create your first session.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectSession(s)}
                  className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1E3048]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E3048] bg-[#0D1628] transition-colors group-hover:border-[#1565C0]/50">
                    <Video className="h-5 w-5 text-[#5A7A9A]" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                        {s.video_name}
                      </p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {formatDate(s.created_at)}
                    </p>
                    {s.status === 'completed' &&
                      s.unique_person_count !== null && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#1565C0]/10 px-2 py-0.5">
                          <Users className="h-3 w-3 text-[#60A5FA]" />
                          <span className="text-[10px] font-semibold text-[#60A5FA]">
                            {s.unique_person_count} unique
                          </span>
                        </span>
                      )}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#60A5FA]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1E3048] px-5 py-3">
          <p className="text-center text-[10px] text-[#5A7A9A]">
            Click any session to load its results
          </p>
        </div>
      </div>
    </>
  );
}

// Inline loader helper since Lucide isn't importing Loader2 in the drawer scope
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

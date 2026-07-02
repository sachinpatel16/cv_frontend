'use client';

import { cn } from '@/lib/utils';
import {
  Upload,
  SlidersHorizontal,
  Loader2,
  BarChart3,
  History,
} from 'lucide-react';
import {
  useActivityDetectionStore,
  type ActivityTab,
} from '@/stores/activityDetectionStore';

const TABS: { id: ActivityTab; label: string; Icon: React.ElementType }[] = [
  { id: 'media', label: 'Media', Icon: Upload },
  { id: 'configure', label: 'Configure', Icon: SlidersHorizontal },
  { id: 'processing', label: 'Processing', Icon: Loader2 },
  { id: 'results', label: 'Results', Icon: BarChart3 },
  { id: 'history', label: 'History', Icon: History },
];

export function ActivityNavTabs() {
  const {
    activeTab,
    setActiveTab,
    jobFlavor,
    uploadedMedia,
    smokingSession,
    processStatus,
    alerts,
    smokingEvents,
  } = useActivityDetectionStore();

  const hasActiveJob =
    jobFlavor === 'smoking' ? !!smokingSession : !!uploadedMedia;

  const isLocked = (id: ActivityTab) => {
    if (id === 'configure' || id === 'processing' || id === 'results') {
      return !hasActiveJob;
    }
    return false;
  };

  const countFor = (id: ActivityTab) => {
    if (id === 'results') {
      if (jobFlavor === 'smoking') {
        const confirmed = smokingEvents.filter(
          (e) => e.status === 'smoking_confirmed',
        ).length;
        return confirmed > 0 ? confirmed : undefined;
      }
      return alerts.length > 0 ? alerts.length : undefined;
    }
    return undefined;
  };

  return (
    <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
      {TABS.map(({ id, label, Icon }) => {
        const locked = isLocked(id);
        const count = countFor(id);
        const active = activeTab === id;
        return (
          <button
            key={id}
            onClick={() => !locked && setActiveTab(id)}
            disabled={locked}
            title={locked ? 'Upload media first' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors',
              active
                ? 'bg-amber-500 text-white shadow-sm'
                : locked
                  ? 'cursor-not-allowed text-[#1E3048]'
                  : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
              id === 'processing' &&
                processStatus?.status === 'processing' &&
                !active
                ? 'text-blue-400'
                : '',
            )}
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5',
                id === 'processing' &&
                  processStatus?.status === 'processing' &&
                  'animate-spin',
              )}
            />
            <span className="hidden sm:inline">{label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0 text-[9px] font-bold',
                  active
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-500/20 text-amber-400',
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

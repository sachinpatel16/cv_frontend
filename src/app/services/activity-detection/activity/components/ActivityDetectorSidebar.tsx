'use client';

import { cn } from '@/lib/utils';
import {
  ArrowDownCircle,
  Zap,
  AlertOctagon,
  MapPin,
  Clock,
  Users,
  Moon,
  Smartphone,
  User,
  Package,
} from 'lucide-react';
import { Flame } from 'lucide-react';
import {
  useActivityDetectionStore,
  type ActivityDetectorId,
} from '@/stores/activityDetectionStore';

interface DetectorDef {
  id: ActivityDetectorId;
  label: string;
  description: string;
  Icon: React.ElementType;
  accent: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  status: 'live' | 'coming_soon';
}

export const DETECTOR_CATALOG: DetectorDef[] = [
  {
    id: 'fall',
    label: 'Fall Detection',
    description: 'Detect people who have fallen or collapsed',
    Icon: ArrowDownCircle,
    accent: '#EF4444',
    accentBg: 'bg-red-500/10',
    accentText: 'text-red-400',
    accentBorder: 'border-red-500/40',
    status: 'live',
  },
  {
    id: 'fighting',
    label: 'Fighting / Aggression',
    description: 'Physical altercations and aggressive behavior',
    Icon: Zap,
    accent: '#F97316',
    accentBg: 'bg-orange-500/10',
    accentText: 'text-orange-400',
    accentBorder: 'border-orange-500/40',
    status: 'live',
  },
  {
    id: 'trespassing',
    label: 'Trespassing',
    description: 'People entering a restricted polygon zone',
    Icon: MapPin,
    accent: '#8B5CF6',
    accentBg: 'bg-violet-500/10',
    accentText: 'text-violet-400',
    accentBorder: 'border-violet-500/40',
    status: 'live',
  },
  {
    id: 'loitering',
    label: 'Loitering',
    description: 'People lingering beyond a configurable time threshold',
    Icon: Clock,
    accent: '#F59E0B',
    accentBg: 'bg-amber-500/10',
    accentText: 'text-amber-400',
    accentBorder: 'border-amber-500/40',
    status: 'live',
  },
  {
    id: 'occupancy',
    label: 'Occupancy Limit',
    description: 'Alert when headcount exceeds the configured limit',
    Icon: Users,
    accent: '#06B6D4',
    accentBg: 'bg-cyan-500/10',
    accentText: 'text-cyan-400',
    accentBorder: 'border-cyan-500/40',
    status: 'live',
  },
  {
    id: 'sleeping',
    label: 'Sleeping Detection',
    description: 'Identify individuals sleeping on duty or in restricted areas',
    Icon: Moon,
    accent: '#6366F1',
    accentBg: 'bg-indigo-500/10',
    accentText: 'text-indigo-400',
    accentBorder: 'border-indigo-500/40',
    status: 'live',
  },
  {
    id: 'walking',
    label: 'Walking / Running',
    description: 'Track walking, running, standing and movement patterns',
    Icon: User,
    accent: '#10B981',
    accentBg: 'bg-emerald-500/10',
    accentText: 'text-emerald-400',
    accentBorder: 'border-emerald-500/40',
    status: 'live',
  },
  {
    id: 'mobile_phone',
    label: 'Mobile Phone Usage',
    description: 'Detect prohibited phone use in restricted areas',
    Icon: Smartphone,
    accent: '#3B82F6',
    accentBg: 'bg-blue-500/10',
    accentText: 'text-blue-400',
    accentBorder: 'border-blue-500/40',
    status: 'live',
  },
  {
    id: 'sitting',
    label: 'Sitting Detection',
    description: 'Monitor sitting behavior in surveilled spaces',
    Icon: AlertOctagon,
    accent: '#EC4899',
    accentBg: 'bg-pink-500/10',
    accentText: 'text-pink-400',
    accentBorder: 'border-pink-500/40',
    status: 'live',
  },
  {
    id: 'theft',
    label: 'Theft Suspicion',
    description: 'Detect suspicious object handling or concealment',
    Icon: Package,
    accent: '#A855F7',
    accentBg: 'bg-purple-500/10',
    accentText: 'text-purple-400',
    accentBorder: 'border-purple-500/40',
    status: 'coming_soon',
  },
];

export function ActivityDetectorSidebar() {
  const { selectedDetector, setSelectedDetector } = useActivityDetectionStore();
  const liveCount = DETECTOR_CATALOG.filter((d) => d.status === 'live').length;
  const soonCount = DETECTOR_CATALOG.filter(
    (d) => d.status === 'coming_soon',
  ).length;

  return (
    <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
      {/* Header */}
      <div className="border-b border-[#1E3048] px-4 py-3">
        <p className="text-xs font-semibold text-[#E8EDF5]">
          Activity Detectors
        </p>
        <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
          {liveCount} live · {soonCount} coming soon
        </p>
      </div>

      {/* Detector list */}
      <div className="divide-y divide-[#1E3048]">
        {DETECTOR_CATALOG.map((det) => {
          const isSelected = selectedDetector === det.id;
          const isLive = det.status === 'live';
          const Icon = det.Icon;
          return (
            <button
              key={det.id}
              onClick={() => isLive && setSelectedDetector(det.id)}
              disabled={!isLive}
              className={cn(
                'group flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-all duration-150',
                isSelected
                  ? `${det.accentBg} ${det.accentBorder}`
                  : isLive
                    ? 'border-transparent hover:bg-[#1E3048]/40'
                    : 'cursor-not-allowed border-transparent opacity-40',
              )}
            >
              <div
                className={cn(
                  'shrink-0 rounded-lg p-1.5 transition-colors',
                  isSelected ? det.accentBg : 'bg-[#1E3048]',
                )}
              >
                <Icon
                  className={cn(
                    'h-3.5 w-3.5 transition-colors',
                    isSelected ? det.accentText : 'text-[#5A7A9A]',
                  )}
                />
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block truncate text-xs font-medium',
                    isSelected ? det.accentText : 'text-[#E8EDF5]',
                  )}
                >
                  {det.label}
                </span>
              </div>

              {isLive ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400">
                  <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
                  LIVE
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-[#1E3048] px-1.5 py-0.5 text-[9px] font-medium text-[#5A7A9A]">
                  SOON
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Returns the detector definition for a given id */
export function getDetectorDef(id: ActivityDetectorId): DetectorDef {
  return DETECTOR_CATALOG.find((d) => d.id === id) ?? DETECTOR_CATALOG[0];
}

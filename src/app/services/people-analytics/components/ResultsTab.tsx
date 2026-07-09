import { useState } from 'react';
import {
  BarChart3,
  Users,
  Eye,
  LogIn,
  LogOut,
  TrendingUp,
  BarChart3 as BarChartIcon,
  Repeat2,
  Star,
  Loader2,
  X,
  UserCircle2,
  CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { StatCard } from './StatCard';
import { OccupancyChart } from './OccupancyChart';
import { formatDate, formatDwell } from './utils';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { getAnnotatedVideoUrl } from '@/lib/api/peopleanalytics';
import type { DetectedPerson, AnalyticsSession } from '@/types/peopleanalytics';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function ResultsTab() {
  const { selectedSession, detectedPeople, loadingPeople, visitorStats } =
    usePersonAnalysisStore();

  const [previewPerson, setPreviewPerson] = useState<DetectedPerson | null>(
    null,
  );
  const [registryTab, setRegistryTab] = useState<
    'all' | 'new-guests' | 'staff'
  >('all');
  const [statsTab, setStatsTab] = useState<'session' | 'cross-video'>(
    'session',
  );

  const setSelectedSession = (s: AnalyticsSession | null) => {
    usePersonAnalysisStore.setState({
      selectedSession: s,
      detectedPeople: s ? usePersonAnalysisStore.getState().detectedPeople : [],
    });
  };

  const uniqueDetectedPeople = Array.from(
    new Map(detectedPeople.map((p) => [p.identity_id, p])).values(),
  );

  const newGuests: DetectedPerson[] = (
    selectedSession?.first_time_visitors || []
  ).map((v) => {
    const hasName = v.first_name || v.last_name;
    const name = hasName
      ? `${v.first_name || ''} ${v.last_name || ''}`.trim()
      : `New Visitor #${v.identity_id.slice(0, 4)}`;
    return {
      identity_id: v.identity_id,
      type: 'visitor',
      name: name,
      photo_path: v.photo_path,
      first_seen: v.first_seen,
      last_seen: v.last_seen,
      dwell_time: v.dwell_time,
    };
  });

  const currentList =
    registryTab === 'all'
      ? uniqueDetectedPeople
      : registryTab === 'staff'
        ? uniqueDetectedPeople.filter((p) => p.type === 'employee')
        : newGuests;

  return (
    <div className="space-y-5">
      {!selectedSession ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
            <BarChart3 className="h-6 w-6 text-[#5A7A9A]/40" />
          </div>
          <div>
            <p className="text-sm font-medium text-[#E8EDF5]">
              No Session Selected
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-[#5A7A9A]">
              Please select a session from the History drawer (top right) or
              upload and process a new video in the Video Analytics tab to view
              results.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                {selectedSession.video_name}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <StatusBadge status={selectedSession.status} />
                <span className="text-[10px] text-[#5A7A9A]">
                  {formatDate(selectedSession.created_at)}
                </span>
              </div>
            </div>
            <Link
              href="/services/people-analytics/attendance"
              className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3.5 py-2 text-xs font-semibold text-[#60A5FA] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Visitor Attendance Logs
            </Link>
          </div>

          {selectedSession.status === 'completed' && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left Column: Visual Footage & Occupancy Graphs (60%) */}
              <div className="space-y-5 lg:col-span-7 xl:col-span-8">
                {/* Annotated video */}
                {selectedSession.output_video_path && (
                  <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
                    <p className="mb-3 text-xs font-semibold text-[#5A7A9A]">
                      Annotated Video Feed
                    </p>
                    <video
                      key={selectedSession.id}
                      controls
                      preload="metadata"
                      playsInline
                      className="w-full rounded-lg border border-[#1E3048]/40 shadow-lg"
                    >
                      <source
                        src={getAnnotatedVideoUrl(selectedSession.id)}
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}

                {/* Occupancy chart */}
                {selectedSession.occupancy_timeline &&
                  selectedSession.occupancy_timeline.length > 0 && (
                    <OccupancyChart data={selectedSession.occupancy_timeline} />
                  )}
              </div>

              {/* Right Column: Tabbed Stats & Visitor Registry (40%) */}
              <div className="space-y-5 lg:col-span-5 xl:col-span-4">
                {/* Tabbed Stats Card */}
                <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  {/* Tab header */}
                  <div className="flex border-b border-[#1E3048] bg-[#0A0F1E]/40">
                    {[
                      { id: 'session', label: 'Session Stats' },
                      { id: 'cross-video', label: 'All-Time Insights' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setStatsTab(tab.id as any)}
                        className={cn(
                          'flex-1 cursor-pointer py-2.5 text-[11px] font-bold tracking-wide transition-colors',
                          statsTab === tab.id
                            ? 'border-b-2 border-[#1565C0] bg-[#1565C0]/5 text-[#60A5FA]'
                            : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                        )}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Session Stats */}
                  {statsTab === 'session' && (
                    <div className="grid grid-cols-2 gap-3 p-4">
                      <StatCard
                        label="Unique People"
                        value={selectedSession.unique_person_count}
                        icon={Users}
                        color="blue"
                      />
                      <StatCard
                        label="Total Detections"
                        value={selectedSession.total_person_count}
                        icon={Eye}
                        color="purple"
                      />
                      {selectedSession.entry_count !== null &&
                        selectedSession.entry_count !== undefined && (
                          <StatCard
                            label="Entries"
                            value={selectedSession.entry_count}
                            icon={LogIn}
                            color="green"
                          />
                        )}
                      {selectedSession.exit_count !== null &&
                        selectedSession.exit_count !== undefined && (
                          <StatCard
                            label="Exits"
                            value={selectedSession.exit_count}
                            icon={LogOut}
                            color="amber"
                          />
                        )}
                      <StatCard
                        label="Peak Occupancy"
                        value={selectedSession.peak_occupancy}
                        icon={TrendingUp}
                        color="red"
                      />
                      <StatCard
                        label="Avg Occupancy"
                        value={
                          selectedSession.average_occupancy?.toFixed(1) ?? null
                        }
                        icon={BarChartIcon}
                        color="blue"
                      />
                    </div>
                  )}

                  {/* Cross-Video Insights */}
                  {statsTab === 'cross-video' &&
                    (visitorStats ? (
                      <div className="grid grid-cols-2 gap-3 p-4">
                        <StatCard
                          label="Unique People (All-Time)"
                          value={visitorStats.total_unique_people}
                          icon={Users}
                          color="blue"
                        />
                        <StatCard
                          label="Repeat Visitors"
                          value={visitorStats.repeat_visitors_count}
                          icon={Repeat2}
                          color="purple"
                        />
                        <StatCard
                          label="Repeat Rate"
                          value={`${visitorStats.repeat_visitor_rate.toFixed(1)}%`}
                          icon={TrendingUp}
                          color="green"
                        />
                        <StatCard
                          label="New This Month"
                          value={visitorStats.new_visitors_this_month}
                          icon={Star}
                          color="amber"
                        />
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center text-xs text-[#5A7A9A]">
                        No cross-video analytics available yet.
                      </div>
                    ))}
                </div>

                {/* Detected people list */}
                <div className="flex flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <div className="shrink-0 border-b border-[#1E3048] px-5 py-3">
                    <p className="text-xs font-semibold text-[#E8EDF5]">
                      Identity Registries
                    </p>
                  </div>

                  {/* Tab Switcher */}
                  <div className="flex shrink-0 items-center gap-1.5 border-b border-[#1E3048] bg-[#0A0F1E]/30 px-4 py-2">
                    {[
                      {
                        id: 'all',
                        label: 'All Crops',
                        count: uniqueDetectedPeople.length,
                      },
                      {
                        id: 'new-guests',
                        label: 'First-Time',
                        count: newGuests.length,
                      },
                      {
                        id: 'staff',
                        label: 'Staff',
                        count: uniqueDetectedPeople.filter(
                          (p) => p.type === 'employee',
                        ).length,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setRegistryTab(tab.id as any)}
                        className={cn(
                          'flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-[10px] font-bold tracking-wide transition-all',
                          registryTab === tab.id
                            ? 'border-[#1565C0] bg-[#1565C0] text-white'
                            : 'border-transparent bg-transparent text-[#5A7A9A] hover:border-[#1E3048] hover:text-[#E8EDF5]',
                        )}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={cn(
                            'rounded-full px-1 text-[8px]',
                            registryTab === tab.id
                              ? 'bg-white/20 text-white'
                              : 'bg-[#1E3048] text-[#5A7A9A]',
                          )}
                        >
                          {tab.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  {loadingPeople ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
                    </div>
                  ) : currentList.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#5A7A9A]">
                      {registryTab === 'all'
                        ? 'No visitor or staff records detected.'
                        : registryTab === 'staff'
                          ? 'No staff members detected in this session.'
                          : 'No new first-time visitors detected.'}
                    </div>
                  ) : (
                    <div className="custom-scrollbar max-h-[380px] overflow-y-auto p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {currentList.map((p) => (
                          <button
                            key={p.identity_id}
                            onClick={() => setPreviewPerson(p)}
                            className="group cursor-pointer rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 text-center transition-all hover:border-[#1565C0]/50 hover:bg-[#1E3048]/40 hover:shadow-lg"
                          >
                            <div className="relative mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full border-2 border-[#1E3048] transition-colors group-hover:border-[#1565C0]/60">
                              {p.photo_path ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={`${BACKEND_URL}/${p.photo_path}`}
                                  alt={p.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center bg-[#1E3048]">
                                  <UserCircle2 className="h-6 w-6 text-[#5A7A9A]" />
                                </div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                                <Eye className="h-4 w-4 text-white" />
                              </div>
                            </div>
                            <p className="truncate text-[10px] font-semibold text-[#E8EDF5]">
                              {p.name}
                            </p>
                            <p className="mt-0.5 text-[9px] text-[#5A7A9A]">
                              {formatDwell(p.dwell_time)}
                            </p>
                            <span
                              className={cn(
                                'mt-1 inline-block rounded-full px-2 py-0.5 text-[8px] font-medium',
                                p.type === 'employee'
                                  ? 'bg-emerald-400/10 text-emerald-400'
                                  : 'bg-[#1565C0]/10 text-[#60A5FA]',
                              )}
                            >
                              {p.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Person Preview Modal */}
          {previewPerson && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
              onClick={() => setPreviewPerson(null)}
            >
              <div
                className="w-full max-w-sm overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0D1628] shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="h-1 bg-gradient-to-r from-[#1565C0] to-[#60A5FA]" />
                <div className="relative flex flex-col items-center gap-3 bg-gradient-to-b from-[#0A0F1E] to-[#0D1628] px-6 pt-6 pb-4">
                  <button
                    onClick={() => setPreviewPerson(null)}
                    className="absolute top-3 right-3 rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="h-40 w-40 overflow-hidden rounded-2xl border-4 border-[#1E3048] bg-[#070B14] shadow-2xl">
                    {previewPerson.photo_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${BACKEND_URL}/${previewPerson.photo_path}`}
                        alt={previewPerson.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[#1E3048]">
                        <UserCircle2 className="h-16 w-16 text-[#5A7A9A]" />
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-base font-bold text-[#E8EDF5]">
                      {previewPerson.name}
                    </p>
                    <span
                      className={cn(
                        'mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-medium',
                        previewPerson.type === 'employee'
                          ? 'bg-emerald-400/10 text-emerald-400'
                          : 'bg-[#1565C0]/10 text-[#60A5FA]',
                      )}
                    >
                      {previewPerson.type}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 divide-x divide-[#1E3048] border-t border-[#1E3048]">
                  <div className="flex flex-col items-center gap-0.5 p-4">
                    <p className="text-[10px] text-[#5A7A9A]">First Seen</p>
                    <p className="text-sm font-bold text-[#E8EDF5]">
                      {formatDwell(previewPerson.first_seen)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 p-4">
                    <p className="text-[10px] text-[#5A7A9A]">Dwell Time</p>
                    <p className="text-sm font-bold text-[#60A5FA]">
                      {formatDwell(previewPerson.dwell_time)}
                    </p>
                  </div>
                  <div className="flex flex-col items-center gap-0.5 p-4">
                    <p className="text-[10px] text-[#5A7A9A]">Last Seen</p>
                    <p className="text-sm font-bold text-[#E8EDF5]">
                      {formatDwell(previewPerson.last_seen)}
                    </p>
                  </div>
                </div>
                <div className="border-t border-[#1E3048] px-6 py-3">
                  <p className="text-center text-[10px] text-[#5A7A9A]">
                    ID:{' '}
                    <span className="font-mono text-[#5A7A9A]">
                      {previewPerson.identity_id.slice(0, 8)}…
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {(selectedSession.status === 'pending' ||
            selectedSession.status === 'processing') && (
            <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <Loader2 className="h-8 w-8 animate-spin text-[#5A7A9A]" />
              <p className="text-sm text-[#5A7A9A]">
                Processing in background…
              </p>
              <p className="text-xs text-[#5A7A9A]/60">
                This page will update automatically
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

import React, { useState } from 'react';
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
} from 'lucide-react';
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

  const setSelectedSession = (s: AnalyticsSession | null) => {
    usePersonAnalysisStore.setState({
      selectedSession: s,
      detectedPeople: s ? usePersonAnalysisStore.getState().detectedPeople : [],
    });
  };

  const uniqueDetectedPeople = Array.from(
    new Map(detectedPeople.map((p) => [p.identity_id, p])).values(),
  );

  return (
    <div className="space-y-5">
      {/* Global Aggregated Visitor Stats Banner */}
      {visitorStats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total Unique People"
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
      )}

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
            <button
              onClick={() => setSelectedSession(null)}
              className="flex items-center gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-2.5 py-1.5 text-xs text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Close Results
            </button>
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

              {/* Right Column: Numerical Stats & Visitor Registry (40%) */}
              <div className="space-y-5 lg:col-span-5 xl:col-span-4">
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Unique People"
                    value={selectedSession.unique_person_count}
                    icon={Users}
                    color="blue"
                  />
                  <StatCard
                    label="Total Person"
                    value={selectedSession.total_person_count}
                    icon={Eye}
                    color="purple"
                  />
                  <StatCard
                    label="Entries logged"
                    value={selectedSession.entry_count}
                    icon={LogIn}
                    color="green"
                  />
                  <StatCard
                    label="Exits logged"
                    value={selectedSession.exit_count}
                    icon={LogOut}
                    color="amber"
                  />
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

                {/* Detected people list */}
                <div className="flex flex-col rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <div className="shrink-0 border-b border-[#1E3048] px-5 py-3">
                    <p className="text-xs font-semibold text-[#5A7A9A]">
                      Detected Visitors ({uniqueDetectedPeople.length})
                    </p>
                  </div>
                  {loadingPeople ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
                    </div>
                  ) : uniqueDetectedPeople.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#5A7A9A]">
                      No visitors detected in this session.
                    </div>
                  ) : (
                    <div className="custom-scrollbar max-h-[380px] overflow-y-auto p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {uniqueDetectedPeople.map((p) => (
                          <button
                            key={p.identity_id}
                            onClick={() => setPreviewPerson(p)}
                            className="group rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 text-center transition-all hover:border-[#1565C0]/50 hover:bg-[#1E3048]/40 hover:shadow-lg"
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

'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Trash2,
  Settings2,
  Users,
  Car,
  Activity,
  Layers,
  Search,
  AlertCircle,
  Loader2,
  Sparkles,
  Tv,
} from 'lucide-react';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { useObjectCountingStore } from '@/stores/objectCountingStore';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function ResultsTab() {
  const {
    details,
    detailsLoading,
    removeMedia,
    triggeringAnalysisId,
    setActiveTab,
    setTrackPeople,
    setClassifyGender,
    setTrackVehicles,
    setClassifyVehicle,
    setTrackCustom,
    setSelectedCustomClasses,
    setEntryExitReport,
    setLineCoords,
  } = useObjectCountingStore();

  const videoRef = useRef<HTMLVideoElement>(null);

  const seekVideo = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play().catch(() => {});
    }
  };

  const formatSeconds = (sec: number | null): string => {
    if (sec === null) return '—';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (detailsLoading && !details) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
      </div>
    );
  }

  if (!details) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <p className="text-sm text-[#5A7A9A]">
          Select a media item from the library first to view details and
          results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Media Info Dashboard Bar */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#E8EDF5]">
            {details.filename}
            <span className="rounded bg-[#1E3048] px-2 py-0.5 text-[10px] font-normal text-[#5A7A9A] uppercase">
              {details.media_type}
            </span>
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#5A7A9A]">
            <Calendar className="h-3.5 w-3.5" />
            Uploaded on {new Date(details.created_at).toLocaleString()} · ID:{' '}
            {details.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={details.status} />
          <button
            onClick={() => removeMedia(details.id)}
            className="flex items-center gap-1.5 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Media
          </button>
        </div>
      </div>

      {/* Case 1: Pending (unconfigured/not queued) or Failed prompt */}
      {details.status === 'failed' ||
      (details.status === 'pending' &&
        details.classes_to_track === null &&
        triggeringAnalysisId !== details.id) ? (
        <div className="flex h-96 flex-col items-center justify-center space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center shadow-lg">
          <div className="relative flex items-center justify-center">
            <Settings2 className="h-12 w-12 text-[#5A7A9A]" />
          </div>
          <div className="flex max-w-md flex-col items-center space-y-2">
            <h3 className="text-base font-semibold text-[#E8EDF5]">
              No Tracking Results Yet
            </h3>
            <p className="text-xs leading-relaxed text-[#5A7A9A]">
              {details.status === 'failed'
                ? 'The previous tracker run failed. Please configure tracking presets and try running the analysis again.'
                : 'This media item has not been analyzed yet. Please configure the tracking parameters first.'}
            </p>
            <button
              onClick={() => setActiveTab('config')}
              className="mt-2 flex items-center gap-1.5 rounded-md bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1565C0]/90"
            >
              <Search className="h-4 w-4" />
              Configure & Run Tracker
            </button>
          </div>
        </div>
      ) : details.status === 'processing' ||
        (details.status === 'pending' &&
          (triggeringAnalysisId === details.id ||
            details.classes_to_track !== null)) ? (
        /* Case 2: Processing State UI / Loader */
        <div className="flex h-96 flex-col items-center justify-center space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center shadow-lg">
          <div className="relative flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#1565C0]" />
            <Sparkles className="absolute h-5 w-5 text-[#60A5FA]" />
          </div>
          <div className="flex max-w-md flex-col items-center space-y-2">
            <h3 className="text-base font-semibold text-[#E8EDF5]">
              Analyzing Media File...
            </h3>
            <p className="text-xs leading-relaxed text-[#5A7A9A]">
              YOLO is running frame detections while the BoT-SORT tracker builds
              historical object trajectories. If enabled, InsightFace is mapping
              demographic attributes.
            </p>

            <div className="flex w-full flex-col items-center space-y-2 pt-2">
              <div className="h-2.5 w-64 overflow-hidden rounded-full border border-[#1E3048] bg-[#0A0F1E]">
                <div
                  className="h-full rounded-full bg-[#1565C0] transition-all duration-500"
                  style={{ width: `${details.progress_percentage ?? 0}%` }}
                />
              </div>
              <p className="text-xs font-bold text-[#60A5FA]">
                {details.progress_percentage !== undefined &&
                details.progress_percentage !== null
                  ? `Progress: ${details.progress_percentage}%`
                  : 'Starting analysis...'}
              </p>
            </div>

            <p className="mt-4 animate-pulse text-[10px] text-[#5A7A9A]/60">
              This page will auto-refresh once results are processed by the
              worker.
            </p>
          </div>
        </div>
      ) : details.status === 'completed' ? (
        /* Case 3: Completed State Report */
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
              <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                Total Unique Tracked
              </p>
              <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                {details.total_objects_count ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
              <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                Peak Concurrency
              </p>
              <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                {details.peak_objects_count ?? '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
              <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                Average Concurrency
              </p>
              <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                {details.average_objects_count !== null
                  ? details.average_objects_count.toFixed(2)
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center">
              <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                Footage Duration
              </p>
              <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
                {details.video_duration_seconds !== null
                  ? `${details.video_duration_seconds.toFixed(2)}s`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Line Crossing Analytics Overview */}
          {details.report_summary?.line_crossing_analytics && (
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4 md:grid-cols-2">
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Activity className="h-5 w-5 rotate-90" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                      Total Entries (IN)
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-[#E8EDF5]">
                      {
                        details.report_summary.line_crossing_analytics
                          .total_entries
                      }
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-[#5A7A9A]">
                  Across crossing gate
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#1E3048]/60 p-2 md:border-t-0 md:border-l">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10 text-red-400">
                    <Activity className="h-5 w-5 -rotate-90" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
                      Total Exits (OUT)
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-[#E8EDF5]">
                      {
                        details.report_summary.line_crossing_analytics
                          .total_exits
                      }
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-[#5A7A9A]">
                  Across crossing gate
                </span>
              </div>
            </div>
          )}

          {/* Main Analysis Pane */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left Pane: Media Player & Breakdown Charts */}
            <div className="space-y-6 lg:col-span-2">
              <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E] shadow-lg">
                <div className="flex items-center justify-between border-b border-[#1E3048] bg-[#0D1628] px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <Tv className="h-4 w-4 text-[#1565C0]" />
                    <span className="text-xs font-semibold text-[#E8EDF5]">
                      Annotated Tracking HUD Player
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setTrackPeople(
                        details.classes_to_track
                          ? details.classes_to_track.includes('person')
                          : true,
                      );
                      setClassifyGender(details.classify_gender ?? false);

                      const vClasses = [
                        'car',
                        'truck',
                        'bus',
                        'motorcycle',
                        'bicycle',
                      ];
                      setTrackVehicles(
                        details.classes_to_track
                          ? details.classes_to_track.some((c) =>
                              vClasses.includes(c),
                            )
                          : true,
                      );
                      setClassifyVehicle(details.classify_vehicle ?? true);

                      const hasCustom =
                        !!details.classes_to_track &&
                        details.classes_to_track.some(
                          (c) => c !== 'person' && !vClasses.includes(c),
                        );
                      setTrackCustom(hasCustom);

                      setSelectedCustomClasses(
                        details.classes_to_track
                          ? details.classes_to_track.filter(
                              (c) => c !== 'person' && !vClasses.includes(c),
                            )
                          : [],
                      );
                      setEntryExitReport(!!details.entry_exit_report);
                      setLineCoords(details.line_coords || null);
                      setActiveTab('config');
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-[#60A5FA] transition-colors hover:text-white"
                  >
                    <Settings2 className="h-3 w-3" /> Re-trigger / Adjust Config
                  </button>
                </div>

                <div className="relative aspect-video w-full bg-black">
                  {details.media_type === 'video' ? (
                    <video
                      ref={videoRef}
                      src={`${BACKEND_URL}/${details.processed_filepath || details.filepath}`}
                      controls
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${BACKEND_URL}/${details.processed_filepath || details.filepath}`}
                      alt="Annotated results"
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Advanced Breakdowns Row */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Detected Classes Donut */}
                <div className="flex flex-col space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-1">
                  <div>
                    <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                      Class Distribution
                    </h3>
                    <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                      Frequency of unique custom objects.
                    </p>
                  </div>

                  <div className="my-auto space-y-3 pt-2">
                    {details.report_summary?.unique_counts &&
                    Object.keys(details.report_summary.unique_counts).length >
                      0 ? (
                      Object.entries(details.report_summary.unique_counts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([cname, count]) => {
                          const total =
                            Object.values(
                              details.report_summary!.unique_counts,
                            ).reduce((a, b) => a + b, 0) || 1;
                          const percent = Math.round((count / total) * 100);
                          return (
                            <div key={cname} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium text-[#E8EDF5] capitalize">
                                  {cname}
                                </span>
                                <span className="font-semibold text-[#5A7A9A]">
                                  {count} ({percent}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                                <div
                                  className="h-full bg-[#1565C0]"
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <div className="py-8 text-center text-xs text-[#5A7A9A]">
                        No objects detected.
                      </div>
                    )}
                  </div>
                </div>

                {/* InsightFace Demographics */}
                <div className="flex flex-col space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                        Demographics (insightface)
                      </h3>
                      <span className="rounded border border-emerald-500/15 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                        {details.classify_gender ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                      Gender breakdowns identified from facial head crops of
                      tracked people.
                    </p>
                  </div>

                  {details.classify_gender &&
                  details.report_summary?.gender_breakdown ? (
                    <div className="my-auto space-y-4 pt-4">
                      {Object.entries(
                        details.report_summary.gender_breakdown,
                      ).map(([gender, count]) => {
                        const total =
                          Object.values(
                            details.report_summary?.gender_breakdown || {},
                          ).reduce((a, b) => a + b, 0) || 1;
                        const percent = Math.round((count / total) * 100);
                        const colorMap: Record<string, string> = {
                          male: 'bg-[#1565C0]',
                          female: 'bg-pink-500',
                          unknown: 'bg-gray-500',
                        };
                        return (
                          <div key={gender} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-medium text-[#E8EDF5] capitalize">
                                {gender}
                              </span>
                              <span className="font-semibold text-[#5A7A9A]">
                                {count} ({percent}%)
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                              <div
                                className={cn(
                                  'h-full',
                                  colorMap[gender] || 'bg-gray-500',
                                )}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center space-y-2 py-6 text-center">
                      <Users className="h-8 w-8 text-[#1E3048]" />
                      <p className="max-w-[200px] text-xs text-[#5A7A9A]">
                        {details.classify_gender
                          ? 'No human facial profiles were captured or resolved.'
                          : 'InsightFace classification was not toggled in settings.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Line Crossing Class Breakdown Table */}
                {details.report_summary?.line_crossing_analytics && (
                  <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 lg:col-span-1">
                    <div>
                      <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
                        Line Crossing Breakdown
                      </h3>
                      <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                        Detailed breakdown of entries and exits for each
                        category.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs text-[#E8EDF5]">
                        <thead>
                          <tr className="border-b border-[#1E3048] font-semibold text-[#5A7A9A]">
                            <th className="py-2">Category</th>
                            <th className="py-2 text-right">IN</th>
                            <th className="py-2 text-right">OUT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1E3048]/60">
                          {Object.entries(
                            details.report_summary.line_crossing_analytics
                              .class_breakdown,
                          ).map(([cname, counts]) => (
                            <tr
                              key={cname}
                              className="transition-colors hover:bg-[#1E3048]/25"
                            >
                              <td className="flex items-center gap-1.5 py-2.5 font-medium capitalize">
                                {cname === 'person' ? (
                                  <Users className="h-3.5 w-3.5 text-[#1565C0]" />
                                ) : (
                                  <Car className="h-3.5 w-3.5 text-[#1565C0]" />
                                )}
                                {cname}
                              </td>
                              <td className="py-2.5 text-right font-bold text-emerald-400">
                                +{counts.entry}
                              </td>
                              <td className="py-2.5 text-right font-bold text-red-400">
                                -{counts.exit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane: Tracking Timelines list */}
            <div className="flex h-[520px] flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <div className="flex items-center justify-between border-b border-[#1E3048] px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#1565C0]" />
                  <h3 className="text-xs font-bold tracking-wider text-[#E8EDF5] uppercase">
                    Timeline Results ({details.results?.length ?? 0})
                  </h3>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {!details.results || details.results.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center space-y-2 text-center text-[#5A7A9A]">
                    <Activity className="h-8 w-8 text-[#1E3048]" />
                    <p className="text-xs">
                      No individual tracking paths detected. Try lowering the
                      confidence threshold.
                    </p>
                  </div>
                ) : (
                  details.results.map((track) => (
                    <div
                      key={track.id}
                      onClick={() => seekVideo(track.start_time)}
                      className="group/item flex cursor-pointer items-center gap-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 transition-all hover:border-[#1565C0]/40"
                    >
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-[#1E3048] bg-black">
                        <video
                          src={`${BACKEND_URL}/${details.filepath}#t=${track.start_time}`}
                          preload="metadata"
                          muted
                          playsInline
                          className="pointer-events-none h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#E8EDF5] capitalize group-hover/item:text-[#60A5FA]">
                          {track.class_name} #{track.track_id}
                        </p>
                        <p className="mt-1 text-[10px] text-[#5A7A9A]">
                          Frames: {track.first_frame} – {track.last_frame}
                        </p>
                        {track.gender && (
                          <span className="mt-1 inline-flex items-center rounded bg-pink-500/10 px-1 py-0.5 text-[9px] font-bold text-pink-400">
                            {track.gender}
                          </span>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="inline-block rounded bg-[#1565C0]/10 px-2 py-0.5 text-[10px] font-bold text-[#60A5FA]">
                          {formatSeconds(track.start_time)} –{' '}
                          {formatSeconds(track.end_time)}
                        </span>
                        <p className="mt-1 text-[9px] text-[#5A7A9A]/60">
                          Active:{' '}
                          {(track.end_time - track.start_time).toFixed(1)}s
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Case 4: Default fallback prompt if status isn't matched */
        <div className="flex h-96 flex-col items-center justify-center space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-6 text-center shadow-lg">
          <div className="relative flex items-center justify-center">
            <AlertCircle className="h-12 w-12 text-[#5A7A9A]" />
          </div>
          <div className="flex max-w-md flex-col items-center space-y-2">
            <h3 className="text-base font-semibold text-[#E8EDF5]">
              Tracking Status: {details.status}
            </h3>
            <p className="text-xs leading-relaxed text-[#5A7A9A]">
              Status is currently &quot;{details.status}&quot;. Select details
              to configure, run, or wait for active analysis processing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

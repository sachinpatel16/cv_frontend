'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import {
  Video,
  Loader2,
  RotateCcw,
  X,
  History,
  ChevronRight,
  Users,
  TrendingUp,
  UserCircle2,
  BarChart3,
  Eye,
  LogIn,
  LogOut,
  Repeat2,
  Star,
  Upload,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  getAnnotatedVideoUrl,
  getVisitorAnalytics,
} from '@/lib/api/peopleanalytics';
import { usePersonAnalysisStore } from '@/stores/personAnalysisStore';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import { StatCard } from '@/components/services/shared/StatCard';
import { LineDrawingCanvas } from '@/components/services/shared/LineDrawingCanvas';
import type {
  UploadedVideo,
  AnalyticsSession,
  DetectedPerson,
} from '@/types/peopleanalytics';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ── Helpers ──
function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
function formatDwell(seconds: number) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
}

// ── Occupancy Chart ──
function OccupancyChart({
  data,
}: {
  data: { time_sec: number; occupancy: number }[];
}) {
  if (data.length < 2) return null;
  const maxTime = data[data.length - 1]?.time_sec ?? 0;
  const formatTick = (v: number) => {
    if (maxTime < 60) return `${Math.round(v)}s`;
    const m = Math.floor(v / 60);
    const s = Math.round(v % 60);
    return maxTime < 600 ? (s === 0 ? `${m}m` : `${m}m ${s}s`) : `${m}m`;
  };
  const ticks: number[] = [];
  const step = maxTime / 4;
  for (let i = 0; i <= 4; i++) {
    const val = Math.round(i * step);
    if (!ticks.includes(val)) ticks.push(val);
  }
  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
      <p className="mb-4 text-xs font-semibold text-[#5A7A9A]">
        Occupancy Timeline
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E3048" />
          <XAxis
            type="number"
            dataKey="time_sec"
            domain={[0, maxTime]}
            ticks={ticks}
            tickFormatter={formatTick}
            tick={{ fill: '#5A7A9A', fontSize: 10 }}
            axisLine={{ stroke: '#1E3048' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#5A7A9A', fontSize: 10 }}
            axisLine={{ stroke: '#1E3048' }}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: '#0D1628',
              border: '1px solid #1E3048',
              borderRadius: 8,
              fontSize: 11,
              color: '#E8EDF5',
            }}
            labelFormatter={(v) => `${v}s`}
          />
          <Line
            type="monotone"
            dataKey="occupancy"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#60A5FA' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── History Drawer ──
function HistoryDrawer() {
  const {
    historyOpen,
    sessions,
    sessionsLoading,
    fetchSessions,
    selectSession,
    setHistoryOpen,
  } = usePersonAnalysisStore();
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          historyOpen
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0',
        )}
        onClick={() => setHistoryOpen(false)}
      />
      <div
        className={cn(
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300 ease-in-out',
          historyOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <History className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                Session History
              </p>
              <p className="text-[10px] text-[#5A7A9A]">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={fetchSessions}
              disabled={sessionsLoading}
              className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
            >
              <RotateCcw
                className={cn('h-4 w-4', sessionsLoading && 'animate-spin')}
              />
            </button>
            <button
              onClick={() => setHistoryOpen(false)}
              className="rounded-lg p-2 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessionsLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center">
              <History className="h-8 w-8 text-[#5A7A9A]/30" />
              <p className="text-sm text-[#5A7A9A]">No sessions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {sessions.map((s: AnalyticsSession) => (
                <button
                  key={s.id}
                  onClick={() => selectSession(s)}
                  className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1E3048]/50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#1E3048] bg-[#0D1628] group-hover:border-[#1565C0]/50">
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
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 group-hover:text-[#60A5FA]" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="border-t border-[#1E3048] px-5 py-3">
          <p className="text-center text-[10px] text-[#5A7A9A]">
            Click any session to load its results
          </p>
        </div>
      </div>
    </>
  );
}

// ── Video Analytics Tab ──
function VideoAnalyticsTab() {
  const {
    uploads,
    localFiles,
    uploading,
    selectedUploadIds,
    fetchUploads,
    addUploads,
    removeUpload,
    toggleSelectUpload,
    wizardOpen,
    wizardStep,
    wizardVideoIndex,
    wizardVideos,
    videoLines,
    simThreshold,
    confThreshold,
    processing,
    openWizard,
    closeWizard,
    setWizardStep,
    setSimThreshold,
    setConfThreshold,
    handleLineDraw,
    handleSkipLine,
    handleProcess,
    sessions,
    fetchSessions,
    setHistoryOpen,
    setActiveTab,
  } = usePersonAnalysisStore();

  useEffect(() => {
    fetchUploads();
  }, [fetchUploads]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'video/*': [] },
    maxFiles: 10,
    onDrop: addUploads,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
          <p className="text-xs font-semibold text-[#5A7A9A]">
            Upload Saved Videos
          </p>
          <button
            onClick={async () => {
              await fetchSessions();
              setHistoryOpen(true);
            }}
            className="relative flex items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-1.5 text-xs font-medium text-[#5A7A9A] hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <History className="h-3.5 w-3.5" /> History
            {sessions.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1565C0] text-[9px] font-bold text-white">
                {sessions.length > 99 ? '99+' : sessions.length}
              </span>
            )}
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div
            {...getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
              isDragActive
                ? 'border-[#1565C0] bg-[#1565C0]/5'
                : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#5A7A9A]" />
            ) : (
              <Upload className="h-8 w-8 text-[#5A7A9A]" />
            )}
            <p className="text-sm text-[#5A7A9A]">
              {isDragActive
                ? 'Drop videos here…'
                : 'Drag & drop video files or click to browse'}
            </p>
            <p className="text-xs text-[#5A7A9A]/60">
              MP4, AVI, MOV — up to 10 files
            </p>
          </div>
          {uploads.length > 0 && (
            <div className="space-y-2">
              {uploads.map((u: UploadedVideo) => (
                <div
                  key={u.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-2.5 transition-all select-none',
                    selectedUploadIds.includes(u.id)
                      ? 'border-[#3B82F6] bg-[#1565C0]/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'border-[#1E3048] bg-[#0A0F1E] hover:border-[#1E3048]/80 hover:bg-[#1E3048]/20',
                  )}
                  onClick={() => toggleSelectUpload(u.id)}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all',
                      selectedUploadIds.includes(u.id)
                        ? 'border-[#60A5FA] bg-[#1565C0]'
                        : 'border-[#1E3048] bg-[#0D1628]',
                    )}
                  >
                    {selectedUploadIds.includes(u.id) && (
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <Video
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      selectedUploadIds.includes(u.id)
                        ? 'text-[#60A5FA]'
                        : 'text-[#5A7A9A]',
                    )}
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate text-xs transition-colors',
                      selectedUploadIds.includes(u.id)
                        ? 'font-semibold text-[#E8EDF5]'
                        : 'text-[#5A7A9A]',
                    )}
                  >
                    {u.original_name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeUpload(u.id);
                    }}
                    className="rounded p-0.5 text-[#5A7A9A] hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={openWizard}
                disabled={selectedUploadIds.length === 0}
                className={cn(
                  'mt-2 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all',
                  selectedUploadIds.length > 0
                    ? 'bg-[#1565C0] shadow-lg shadow-[#1565C0]/20 hover:bg-[#1976D2]'
                    : 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-50',
                )}
              >
                {selectedUploadIds.length > 0
                  ? `Configure & Process (${selectedUploadIds.length} Selected) →`
                  : 'Configure & Process →'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wizard Modal */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0D1628] shadow-2xl">
            <div className="h-1 w-full bg-gradient-to-r from-[#1565C0] to-[#60A5FA]" />
            <div className="flex items-center gap-2 border-b border-[#1E3048] px-6 py-3">
              {(['line', 'thresholds', 'confirm'] as const).map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold',
                      wizardStep === step
                        ? 'bg-[#1565C0] text-white'
                        : 'bg-[#1E3048] text-[#5A7A9A]',
                    )}
                  >
                    {i + 1}
                  </div>
                  <span
                    className={cn(
                      'text-xs',
                      wizardStep === step ? 'text-[#E8EDF5]' : 'text-[#5A7A9A]',
                    )}
                  >
                    {step === 'line'
                      ? 'Draw Line'
                      : step === 'thresholds'
                        ? 'Thresholds'
                        : 'Confirm'}
                  </span>
                  {i < 2 && <div className="h-px w-6 bg-[#1E3048]" />}
                </div>
              ))}
              <button
                onClick={closeWizard}
                className="ml-auto text-[#5A7A9A] hover:text-[#E8EDF5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6">
              {wizardStep === 'line' && (
                <LineDrawingCanvas
                  videoName={
                    wizardVideos[wizardVideoIndex]?.original_name ?? ''
                  }
                  videoFile={
                    localFiles[wizardVideos[wizardVideoIndex]?.id] ?? null
                  }
                  videoSavedPath={
                    wizardVideos[wizardVideoIndex]?.saved_path ?? null
                  }
                  onLineDraw={handleLineDraw}
                  onSkip={handleSkipLine}
                />
              )}
              {wizardStep === 'thresholds' && (
                <div className="space-y-6">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-medium text-[#E8EDF5]">
                        Similarity Threshold
                      </label>
                      <span className="text-xs font-bold text-[#60A5FA]">
                        {simThreshold.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1}
                      step={0.01}
                      value={simThreshold}
                      onChange={(e) =>
                        setSimThreshold(parseFloat(e.target.value))
                      }
                      className="w-full accent-[#1565C0]"
                    />
                    <p className="mt-1 text-[10px] text-[#5A7A9A]">
                      Higher = stricter face matching (default 0.85)
                    </p>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-xs font-medium text-[#E8EDF5]">
                        Confidence Threshold
                      </label>
                      <span className="text-xs font-bold text-[#60A5FA]">
                        {confThreshold.toFixed(2)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={confThreshold}
                      onChange={(e) =>
                        setConfThreshold(parseFloat(e.target.value))
                      }
                      className="w-full accent-[#1565C0]"
                    />
                    <p className="mt-1 text-[10px] text-[#5A7A9A]">
                      YOLO detection confidence (default 0.30)
                    </p>
                  </div>
                  <button
                    onClick={() => setWizardStep('confirm')}
                    className="w-full rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2]"
                  >
                    Next: Review →
                  </button>
                </div>
              )}
              {wizardStep === 'confirm' && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-[#E8EDF5]">
                    Review & Submit
                  </p>
                  <div className="divide-y divide-[#1E3048] rounded-lg border border-[#1E3048]">
                    {wizardVideos.map((u: UploadedVideo) => {
                      const lineInfo = videoLines[u.id];
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <Video className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                          <span className="min-w-0 flex-1 truncate text-xs text-[#E8EDF5]">
                            {u.original_name}
                          </span>
                          <span className="text-[10px] text-[#5A7A9A]">
                            {lineInfo
                              ? `Line: [${lineInfo.start}] → [${lineInfo.end}]`
                              : 'No line (default)'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-4 text-xs text-[#5A7A9A]">
                    <span>
                      Similarity:{' '}
                      <strong className="text-[#E8EDF5]">{simThreshold}</strong>
                    </span>
                    <span>
                      Confidence:{' '}
                      <strong className="text-[#E8EDF5]">
                        {confThreshold}
                      </strong>
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      handleProcess(() => {
                        setActiveTab('results');
                      })
                    }
                    disabled={processing}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2] disabled:opacity-60"
                  >
                    {processing && <Loader2 className="h-4 w-4 animate-spin" />}{' '}
                    Start Processing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Results Tab ──
function ResultsTab() {
  const { selectedSession, detectedPeople, loadingPeople, visitorStats } =
    usePersonAnalysisStore();
  const [previewPerson, setPreviewPerson] = useState<DetectedPerson | null>(
    null,
  );

  const uniquePeople = Array.from(
    new Map<string, DetectedPerson>(
      detectedPeople.map((p: DetectedPerson) => [p.identity_id, p]),
    ).values(),
  );

  return (
    <div className="space-y-5">
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
          <BarChart3 className="h-8 w-8 text-[#5A7A9A]/30" />
          <div>
            <p className="text-sm font-medium text-[#E8EDF5]">
              No Session Selected
            </p>
            <p className="mt-1 text-xs text-[#5A7A9A]">
              Select a session from History or process a new video.
            </p>
          </div>
        </div>
      ) : (
        <>
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
              onClick={() =>
                usePersonAnalysisStore.setState({ selectedSession: null })
              }
              className="rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-2.5 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Close Results
            </button>
          </div>
          {selectedSession.status === 'completed' && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div className="space-y-5 lg:col-span-7 xl:col-span-8">
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
                    </video>
                  </div>
                )}
                {selectedSession.occupancy_timeline &&
                  selectedSession.occupancy_timeline.length > 0 && (
                    <OccupancyChart data={selectedSession.occupancy_timeline} />
                  )}
              </div>
              <div className="space-y-5 lg:col-span-5 xl:col-span-4">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    label="Unique People"
                    value={selectedSession.unique_person_count}
                    icon={Users}
                    color="blue"
                  />
                  <StatCard
                    label="Total Crossings"
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
                    icon={BarChart3}
                    color="blue"
                  />
                </div>
                <div className="flex flex-col rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <div className="shrink-0 border-b border-[#1E3048] px-5 py-3">
                    <p className="text-xs font-semibold text-[#5A7A9A]">
                      Detected Visitors ({uniquePeople.length})
                    </p>
                  </div>
                  {loadingPeople ? (
                    <div className="flex h-32 items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
                    </div>
                  ) : uniquePeople.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#5A7A9A]">
                      No visitors detected.
                    </div>
                  ) : (
                    <div className="max-h-[380px] overflow-y-auto p-4">
                      <div className="grid grid-cols-2 gap-2">
                        {uniquePeople.map((p) => (
                          <button
                            key={p.identity_id}
                            onClick={() => setPreviewPerson(p)}
                            className="group rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-3 text-center transition-all hover:border-[#1565C0]/50 hover:bg-[#1E3048]/40"
                          >
                            <div className="relative mx-auto mb-2 h-12 w-12 overflow-hidden rounded-full border-2 border-[#1E3048] group-hover:border-[#1565C0]/60">
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
          {(selectedSession.status === 'pending' ||
            selectedSession.status === 'processing') && (
            <div className="flex h-32 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
              <p className="text-sm text-[#5A7A9A]">
                Processing in background…
              </p>
            </div>
          )}
        </>
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
                className="absolute top-3 right-3 rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048]"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="h-28 w-28 overflow-hidden rounded-2xl border-4 border-[#1E3048] shadow-2xl">
                {previewPerson.photo_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${BACKEND_URL}/${previewPerson.photo_path}`}
                    alt={previewPerson.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[#1E3048]">
                    <UserCircle2 className="h-16 w-16 text-[#5A7A9A]" />
                  </div>
                )}
              </div>
              <p className="text-base font-bold text-[#E8EDF5]">
                {previewPerson.name}
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-[#1E3048] border-t border-[#1E3048]">
              {[
                ['First Seen', formatDwell(previewPerson.first_seen)],
                ['Dwell', formatDwell(previewPerson.dwell_time)],
                ['Last Seen', formatDwell(previewPerson.dwell_time)],
              ].map(([label, val]) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-0.5 p-4"
                >
                  <p className="text-[10px] text-[#5A7A9A]">{label}</p>
                  <p className="text-sm font-bold text-[#60A5FA]">{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
const TABS = [
  { id: 'analytics' as const, label: 'Video Analytics', icon: Video },
  { id: 'results' as const, label: 'Results', icon: BarChart3 },
];

export default function PeopleAnalyticsPage() {
  const {
    activeTab,
    setActiveTab,
    fetchSessions,
    sessions,
    selectedSession,
    setHistoryOpen,
  } = usePersonAnalysisStore();

  useEffect(() => {
    fetchSessions();
    getVisitorAnalytics()
      .then((r) => usePersonAnalysisStore.setState({ visitorStats: r.data }))
      .catch(() => {});
  }, [fetchSessions]);

  // Auto-poll processing sessions
  useEffect(() => {
    const hasPending = sessions.some(
      (s: AnalyticsSession) =>
        s.status === 'pending' || s.status === 'processing',
    );
    if (!hasPending) return;
    const timer = setInterval(() => fetchSessions(), 5000);
    return () => clearInterval(timer);
  }, [sessions, fetchSessions]);

  // Update selectedSession status from polled data
  useEffect(() => {
    const { selectedSession: sel, sessions: ss } =
      usePersonAnalysisStore.getState();
    if (!sel) return;
    const updated = ss.find((s: AnalyticsSession) => s.id === sel.id);
    if (updated && updated.status !== sel.status) {
      usePersonAnalysisStore.setState({ selectedSession: updated });
    }
  }, [sessions]);

  return (
    <div className="max-w-6xl space-y-6">
      <p className="text-sm text-[#5A7A9A]">
        CCTV video crossing analytics, interactive entry/exit gate
        configuration, and occupancy metrics.
      </p>

      {/* Tab Bar */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === id
                ? 'bg-[#1565C0] text-white'
                : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'analytics' && <VideoAnalyticsTab />}
      {activeTab === 'results' && <ResultsTab />}

      <HistoryDrawer />
    </div>
  );
}

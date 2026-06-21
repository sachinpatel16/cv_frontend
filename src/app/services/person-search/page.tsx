'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Upload,
  Search,
  ImageIcon,
  Video,
  Trash2,
  Loader2,
  RotateCcw,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Film,
  ScanFace,
  TriangleAlert,
  History,
  ChevronRight,
  ChevronLeft,
  Download,
  UserCircle2,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  uploadMedia,
  listMedia,
  deleteMedia,
  bulkDeleteMedia,
  searchBySelfie,
  searchVideo,
  getSessionMatches,
  getSessionHistory,
} from '@/lib/api/peoplefind';
import { ApiError } from '@/types/api';
import type {
  MediaSource,
  SearchSession,
  SearchMatch,
  SessionHistoryItem,
} from '@/types/peoplefind';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'library' | 'search' | 'results';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'library', label: 'Media Library', icon: ImageIcon },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'results', label: 'Results', icon: CheckCircle2 },
];

// ── Status badge ──
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ElementType }> = {
    completed: {
      color: 'text-emerald-400 bg-emerald-400/10',
      icon: CheckCircle2,
    },
    pending: { color: 'text-[#F59E0B] bg-[#F59E0B]/10', icon: Clock },
    processing: { color: 'text-[#60A5FA] bg-[#60A5FA]/10', icon: Loader2 },
    failed: { color: 'text-red-400 bg-red-400/10', icon: AlertCircle },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${s.color}`}
    >
      <Icon
        className={cn('h-3 w-3', status === 'processing' && 'animate-spin')}
      />
      {status}
    </span>
  );
}

// ── Similarity colour helper ──
function similarityColor(s: number) {
  if (s >= 0.8) return 'bg-emerald-500/90 text-white';
  if (s >= 0.6) return 'bg-amber-500/90 text-white';
  return 'bg-slate-500/90 text-white';
}

function similarityBarColor(s: number) {
  if (s >= 0.8) return 'bg-emerald-500';
  if (s >= 0.6) return 'bg-amber-500';
  return 'bg-slate-400';
}

function formatTimestamp(seconds: number | null): string {
  if (seconds === null) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimestampLong(seconds: number | null): string {
  if (seconds === null) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

// ── Timeline Marker Grouping ──────────────────────────────────────────────────

interface TimelineRangeGroup {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  bestSimilarity: number;
  matches: SearchMatch[];
}

const PROXIMITY_THRESHOLD_SECONDS = 3;

function groupTimelineMatches(matches: SearchMatch[]): TimelineRangeGroup[] {
  const sorted = [...matches].sort(
    (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
  );

  const groups: TimelineRangeGroup[] = [];
  let currentGroup: TimelineRangeGroup | null = null;

  for (const match of sorted) {
    if (match.timestamp === null) continue;

    if (!currentGroup) {
      currentGroup = {
        id: match.id,
        startTimestamp: match.timestamp,
        endTimestamp: match.timestamp,
        bestSimilarity: match.similarity,
        matches: [match],
      };
    } else {
      const diff = match.timestamp - currentGroup.endTimestamp;
      if (diff <= PROXIMITY_THRESHOLD_SECONDS) {
        currentGroup.endTimestamp = match.timestamp;
        currentGroup.bestSimilarity = Math.max(
          currentGroup.bestSimilarity,
          match.similarity,
        );
        currentGroup.matches.push(match);
      } else {
        groups.push(currentGroup);
        currentGroup = {
          id: match.id,
          startTimestamp: match.timestamp,
          endTimestamp: match.timestamp,
          bestSimilarity: match.similarity,
          matches: [match],
        };
      }
    }
  }

  if (currentGroup) {
    groups.push(currentGroup);
  }

  return groups;
}

// ── Delete Confirmation Modal ──
function DeleteAllModal({
  count,
  onConfirm,
  onCancel,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-[#0D1628] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />

        <div className="space-y-5 p-6">
          {/* Icon + heading */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <TriangleAlert className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#E8EDF5]">
                Delete All Media?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-[#5A7A9A]">
                You are about to permanently delete{' '}
                <span className="font-semibold text-[#E8EDF5]">
                  {count} media file{count !== 1 ? 's' : ''}
                </span>{' '}
                and all associated face embeddings. This action{' '}
                <span className="font-medium text-red-400">
                  cannot be undone
                </span>
                .
              </p>
            </div>
          </div>

          {/* Warning detail */}
          <div className="space-y-1 rounded-lg border border-red-500/15 bg-red-500/5 px-4 py-3 text-xs text-red-300/80">
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-red-400" />
              All indexed photos and videos will be removed
            </p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-red-400" />
              All face recognition data and embeddings will be cleared
            </p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-red-400" />
              Physical files will be deleted from server storage
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-[#1E3048] bg-transparent px-4 py-2.5 text-sm font-medium text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 active:bg-red-700"
            >
              Delete All Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──
export default function PersonSearchPage() {
  const [tab, setTab] = useState<Tab>('library');

  // Media library state
  const [media, setMedia] = useState<MediaSource[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const previewableMedia = media.filter((m) => m.status === 'completed');

  // Search state
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(45);
  const [searching, setSearching] = useState(false);
  const [session, setSession] = useState<SearchSession | null>(null);

  // Results state
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    timestamp: number | null;
    filename: string;
  } | null>(null);

  // Results view mode
  const [resultView, setResultView] = useState<'timeline' | 'grid'>('timeline');

  // Search history drawer
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fetchMedia = useCallback(async (showLoading = true) => {
    if (showLoading) setMediaLoading(true);
    try {
      const res = await listMedia();
      setMedia(res.data);
    } catch {
      // silently fail on initial load
    } finally {
      setMediaLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getSessionHistory();
      setHistory(res.data);
    } catch {
      // silently fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia(false);
  }, [fetchMedia]);

  // Poll media statuses if any item is pending or processing
  useEffect(() => {
    const hasPendingOrProcessing = media.some(
      (m) => m.status === 'pending' || m.status === 'processing',
    );
    if (!hasPendingOrProcessing) return;

    const interval = setInterval(() => {
      fetchMedia(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [media, fetchMedia]);

  // Fetch history once on mount
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  // ── Media upload handler ──
  async function handleUpload(files: File[], mediaType: 'photo' | 'video') {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const res = await uploadMedia(files, mediaType);
      toast.success(`Uploaded ${res.data.length} file(s)`);
      fetchMedia();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  // ── Delete handlers ──
  async function handleDelete(id: string) {
    try {
      await deleteMedia(id);
      toast.success('Media deleted');
      setMedia((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Delete failed');
    }
  }

  async function handleBulkDelete() {
    try {
      await bulkDeleteMedia();
      toast.success('All media deleted');
      setMedia([]);
      setShowDeleteAllModal(false);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Bulk delete failed');
    }
  }

  // ── Search handler ──
  async function handleSearch() {
    if (!selfieFile) return;
    setSearching(true);
    try {
      const res = await searchBySelfie(selfieFile, threshold / 100);
      setSession(res.data);
      setResults(res.data.results);
      toast.success(`Found ${res.data.results.length} match(es)`);
      setTab('results');
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Search failed');
    } finally {
      setSearching(false);
    }
  }

  // ── Video search handler ──
  async function handleVideoSearch(videoId: string) {
    if (!selfieFile) {
      toast.error('Upload a reference selfie first');
      return;
    }
    setSearching(true);
    try {
      const res = await searchVideo(selfieFile, videoId, threshold / 100);
      setSession(res.data);
      toast.success('Video search submitted — polling for results...');
      setTab('results');
      pollSession(res.data.id);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Video search failed');
    } finally {
      setSearching(false);
    }
  }

  async function pollSession(sessionId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await getSessionMatches(sessionId);
        setResults(res.data);
        if (res.data.length > 0) {
          clearInterval(interval);
          toast.success(`Found ${res.data.length} match(es)`);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
    setTimeout(() => clearInterval(interval), 120_000);
  }

  // ── Load a history session into Results tab ──
  async function handleSelectHistory(item: SessionHistoryItem) {
    setTab('results');
    setResults([]);
    setSession(null);
    try {
      const res = await getSessionMatches(item.id);
      const minimal: SearchSession = {
        id: item.id,
        selfie_path: item.selfie_path,
        threshold: item.threshold,
        status: item.status,
        created_at: item.created_at,
        results: res.data,
      };
      setSession(minimal);
      setResults(res.data);
      toast.success(
        res.data.length > 0
          ? `Loaded ${res.data.length} match(es) from history`
          : 'Session loaded — no matches recorded',
      );
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to load session');
    }
  }

  function getMatchFrameUrl(match: SearchMatch): string {
    if (match.media_source.media_type === 'photo') {
      return `${BACKEND_URL}/${match.media_source.filepath}`;
    }
    if (match.timestamp !== null) {
      const seconds = match.timestamp;
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const ss = String(s).padStart(2, '0');
      return `${BACKEND_URL}/storage/video_matches/${match.session_id}/frame_${hh}_${mm}_${ss}.jpg`;
    }
    return `${BACKEND_URL}/${match.media_source.filepath}`;
  }

  const handleTimelineClick = useCallback((matchId: string) => {
    const element = document.getElementById(`match-card-${matchId}`);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
      element.classList.add(
        'ring-2',
        'ring-[#60A5FA]',
        'ring-offset-2',
        'ring-offset-[#0D1628]',
      );
      setTimeout(() => {
        element.classList.remove(
          'ring-2',
          'ring-[#60A5FA]',
          'ring-offset-2',
          'ring-offset-[#0D1628]',
        );
      }, 1500);
    }
  }, []);

  // Group results by video/media source for timeline view
  const videoMatches = results.filter(
    (r) => r.media_source.media_type === 'video',
  );
  const photoMatches = results.filter(
    (r) => r.media_source.media_type === 'photo',
  );

  // Group video matches by media source id
  const videoGroups = videoMatches.reduce<Record<string, SearchMatch[]>>(
    (acc, m) => {
      const key = m.media_source.id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(m);
      return acc;
    },
    {},
  );

  const sortedResults = [...results].sort(
    (a, b) => b.similarity - a.similarity,
  );

  return (
    <div className="max-w-6xl space-y-6">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">Person Search</h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            Find anyone across your media using face recognition.
          </p>
        </div>

        {/* History trigger */}
        <button
          onClick={() => {
            setHistoryOpen(true);
            fetchHistory();
          }}
          className="relative flex shrink-0 items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0D1628] px-3 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
          {history.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#1565C0] text-[9px] font-bold text-white">
              {history.length > 99 ? '99+' : history.length}
            </span>
          )}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === id
                ? 'bg-[#1565C0] text-white'
                : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === 'results' && results.length > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-1.5 text-[10px]">
                {results.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════ Tab: Media Library ════════ */}
      {tab === 'library' && (
        <div className="space-y-5">
          <MediaUploadSection uploading={uploading} onUpload={handleUpload} />

          {/* Media grid */}
          <div className="rounded-xl border border-[#1E3048] bg-[#0D1628]">
            <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
              <p className="text-xs font-semibold text-[#5A7A9A]">
                Indexed Media ({media.length})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchMedia()}
                  className="rounded-md p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                  title="Refresh"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                {media.length > 0 && (
                  <button
                    onClick={() => setShowDeleteAllModal(true)}
                    className="rounded-md p-1.5 text-red-400/60 transition-colors hover:bg-red-400/10 hover:text-red-400"
                    title="Delete all media"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {mediaLoading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
              </div>
            ) : media.length === 0 ? (
              <div className="flex h-40 items-center justify-center">
                <p className="text-sm text-[#5A7A9A]">
                  No media uploaded yet. Upload photos or videos above.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {media.map((item) => (
                  <div
                    key={item.id}
                    className="group relative overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E]"
                  >
                    {(() => {
                      const isCompleted = item.status === 'completed';
                      const previewIdx = previewableMedia.findIndex(
                        (m) => m.id === item.id,
                      );
                      return (
                        <div
                          onClick={() => {
                            if (isCompleted && previewIdx !== -1) {
                              setPreviewIndex(previewIdx);
                            }
                          }}
                          className={cn(
                            'relative aspect-square overflow-hidden bg-[#1E3048]/20 transition-all duration-355',
                            isCompleted
                              ? 'cursor-pointer hover:opacity-90 active:scale-95'
                              : 'cursor-default',
                          )}
                        >
                          {item.media_type === 'photo' ? (
                            <Image
                              src={`${BACKEND_URL}/${item.filepath}`}
                              alt={item.filename}
                              fill
                              className="object-cover transition-transform duration-500 hover:scale-105"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                            />
                          ) : isCompleted ? (
                            <div className="relative h-full w-full">
                              <video
                                src={`${BACKEND_URL}/${item.filepath}#t=0.1`}
                                className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                                preload="metadata"
                                muted
                                playsInline
                              />
                              <div className="absolute right-2 bottom-2 rounded bg-black/60 p-1 text-white/80 backdrop-blur-sm">
                                <Video className="h-3.5 w-3.5" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#1E3048]/50">
                              <Video className="h-8 w-8 text-[#5A7A9A]" />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="space-y-1 p-2">
                      <p
                        className="truncate text-xs text-[#E8EDF5]"
                        title={item.filename}
                      >
                        {item.filename}
                      </p>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={item.status} />
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="rounded p-1 text-[#5A7A9A] opacity-0 transition-all group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ Tab: Search ════════ */}
      {tab === 'search' && (
        <div className="space-y-6">
          {/* Top row: selfie + video */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Selfie upload */}
            <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
              <h2 className="text-sm font-semibold text-[#E8EDF5]">
                Reference Selfie
              </h2>
              <p className="text-xs text-[#5A7A9A]">
                Upload a clear photo of the person you want to find.
              </p>

              <SelfieUpload file={selfieFile} onChange={setSelfieFile} />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#5A7A9A]">
                    Similarity threshold
                  </label>
                  <span className="text-xs font-semibold text-[#E8EDF5]">
                    {threshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={95}
                  step={5}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full accent-[#1565C0]"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={!selfieFile || searching}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-medium text-white transition-colors hover:bg-[#1565C0]/90 disabled:opacity-40"
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" /> Search All Media
                  </>
                )}
              </button>
            </div>

            {/* Video-specific search */}
            <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
              <h2 className="text-sm font-semibold text-[#E8EDF5]">
                Search Specific Video
              </h2>
              <p className="text-xs text-[#5A7A9A]">
                Select a video from your library to search within. Runs as a
                background job.
              </p>

              {media.filter((m) => m.media_type === 'video').length === 0 ? (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-[#1E3048]">
                  <p className="text-xs text-[#5A7A9A]">
                    No videos in your library
                  </p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {media
                    .filter((m) => m.media_type === 'video')
                    .map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-[#1E3048] px-3 py-2"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <Video className="h-4 w-4 shrink-0 text-[#5A7A9A]" />
                          <span className="truncate text-sm text-[#E8EDF5]">
                            {v.filename}
                          </span>
                        </div>
                        <button
                          onClick={() => handleVideoSearch(v.id)}
                          disabled={!selfieFile || searching}
                          className="shrink-0 rounded-md bg-[#1E3048] px-3 py-1 text-xs font-medium text-[#E8EDF5] transition-colors hover:bg-[#1565C0] disabled:opacity-40"
                        >
                          Search
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════ Tab: Results ════════ */}
      {tab === 'results' && (
        <div className="space-y-5">
          {/* Session info banner */}
          {session && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] px-5 py-4">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#1565C0]">
                <Image
                  src={`${BACKEND_URL}/${session.selfie_path}`}
                  alt="Reference selfie"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#E8EDF5]">
                  Search Session
                </p>
                <p className="mt-0.5 text-xs text-[#5A7A9A]">
                  Threshold: {Math.round(session.threshold * 100)}%
                  &nbsp;·&nbsp; <StatusBadge status={session.status} />
                </p>
              </div>

              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 rounded-lg bg-[#1E3048] px-3 py-1.5">
                  <ScanFace className="h-3.5 w-3.5 text-[#60A5FA]" />
                  <span className="text-xs font-semibold text-[#E8EDF5]">
                    {results.length}
                  </span>
                  <span className="text-xs text-[#5A7A9A]">
                    match{results.length !== 1 ? 'es' : ''}
                  </span>
                </div>
                {videoMatches.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#1E3048] px-3 py-1.5">
                    <Film className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-semibold text-[#E8EDF5]">
                      {videoMatches.length}
                    </span>
                    <span className="text-xs text-[#5A7A9A]">in video</span>
                  </div>
                )}
                {photoMatches.length > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-[#1E3048] px-3 py-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-[#E8EDF5]">
                      {photoMatches.length}
                    </span>
                    <span className="text-xs text-[#5A7A9A]">in photo</span>
                  </div>
                )}
              </div>

              {/* View toggle */}
              {results.length > 0 && (
                <div className="flex overflow-hidden rounded-md border border-[#1E3048]">
                  {(['timeline', 'grid'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setResultView(v)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                        resultView === v
                          ? 'bg-[#1565C0] text-white'
                          : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <div className="text-center">
                <Search className="mx-auto h-8 w-8 text-[#5A7A9A]" />
                <p className="mt-2 text-sm text-[#5A7A9A]">
                  {session
                    ? session.status === 'pending' ||
                      session.status === 'processing'
                      ? 'Analysing video — results will appear shortly…'
                      : 'No matches found. Try lowering the threshold.'
                    : 'Run a search to see results here.'}
                </p>
                {session &&
                  (session.status === 'pending' ||
                    session.status === 'processing') && (
                    <Loader2 className="mx-auto mt-3 h-5 w-5 animate-spin text-[#5A7A9A]" />
                  )}
              </div>
            </div>
          )}

          {/* ── Timeline view ── */}
          {results.length > 0 && resultView === 'timeline' && (
            <div className="space-y-6">
              {/* Video timeline groups */}
              {Object.entries(videoGroups).map(([mediaId, matches]) => {
                const sorted = [...matches].sort(
                  (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0),
                );
                const source = sorted[0].media_source;
                const bestSim = Math.max(...sorted.map((m) => m.similarity));

                return (
                  <div
                    key={mediaId}
                    className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]"
                  >
                    {/* Video header */}
                    <div className="flex items-center justify-between border-b border-[#1E3048] bg-[#0A0F1E]/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10">
                          <Film className="h-4 w-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="max-w-xs truncate text-sm font-semibold text-[#E8EDF5]">
                            {source.filename}
                          </p>
                          <p className="text-[11px] text-[#5A7A9A]">
                            {sorted.length} appearance
                            {sorted.length !== 1 ? 's' : ''} detected
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2.5 py-1 text-xs font-bold',
                            similarityColor(bestSim),
                          )}
                        >
                          Best {Math.round(bestSim * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Horizontal scrubber timeline */}
                    <div className="relative px-4 py-4">
                      <p className="mb-3 text-[10px] font-medium tracking-wider text-[#5A7A9A] uppercase">
                        Timeline — click a marker to scroll to instance
                      </p>

                      {/* Ruler bar */}
                      <div className="relative h-2 rounded-full bg-[#1E3048]">
                        {(() => {
                          const maxTs =
                            Math.max(...sorted.map((m) => m.timestamp ?? 0)) ||
                            1;
                          const groups = groupTimelineMatches(sorted);
                          return groups.map((group) => {
                            const startPct =
                              (group.startTimestamp / maxTs) * 100;
                            const endPct = (group.endTimestamp / maxTs) * 100;
                            const isRange =
                              group.endTimestamp > group.startTimestamp;

                            if (isRange) {
                              const leftPct = Math.min(startPct, 98);
                              const rightPct = Math.min(endPct, 100);
                              const widthPct = Math.max(
                                rightPct - leftPct,
                                1.5,
                              );

                              return (
                                <button
                                  key={group.id}
                                  title={`${formatTimestamp(group.startTimestamp)} - ${formatTimestamp(group.endTimestamp)} (${Math.round(group.endTimestamp - group.startTimestamp)}s) · Best Match: ${Math.round(group.bestSimilarity * 100)}% · ${group.matches.length} appearance(s)`}
                                  onClick={() =>
                                    handleTimelineClick(group.matches[0].id)
                                  }
                                  style={{
                                    left: `${leftPct}%`,
                                    width: `${widthPct}%`,
                                  }}
                                  className={cn(
                                    'absolute top-1/2 z-10 h-3 -translate-y-1/2 rounded-full border border-[#0D1628] shadow-sm shadow-black/40 transition-all hover:scale-y-125 hover:brightness-110',
                                    similarityBarColor(group.bestSimilarity),
                                  )}
                                />
                              );
                            } else {
                              const pct = Math.min(Math.max(startPct, 1), 98);
                              return (
                                <button
                                  key={group.id}
                                  title={`${formatTimestamp(group.startTimestamp)} · Match: ${Math.round(group.bestSimilarity * 100)}%`}
                                  onClick={() =>
                                    handleTimelineClick(group.matches[0].id)
                                  }
                                  style={{
                                    left: `${pct}%`,
                                  }}
                                  className={cn(
                                    'absolute top-1/2 z-10 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0D1628] shadow-sm shadow-black/40 transition-transform hover:scale-125',
                                    similarityBarColor(group.bestSimilarity),
                                  )}
                                />
                              );
                            }
                          });
                        })()}
                      </div>

                      {/* Time labels */}
                      <div className="mt-1 flex justify-between text-[9px] text-[#5A7A9A]/60">
                        <span>0:00</span>
                        {sorted.length > 0 &&
                          sorted[sorted.length - 1].timestamp !== null && (
                            <span>
                              {formatTimestamp(
                                sorted[sorted.length - 1].timestamp,
                              )}
                              +
                            </span>
                          )}
                      </div>
                    </div>

                    {/* Sighting cards scroll row */}
                    <div className="scrollbar-thin flex gap-3 overflow-x-auto px-4 pt-1 pb-4">
                      {sorted.map((match, idx) => (
                        <button
                          key={match.id}
                          id={`match-card-${match.id}`}
                          onClick={() =>
                            setSelectedVideo({
                              url: `${BACKEND_URL}/${source.filepath}`,
                              timestamp: match.timestamp,
                              filename: source.filename,
                            })
                          }
                          className="group/card w-40 shrink-0 overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E] text-left transition-all hover:border-[#1565C0]/50 hover:shadow-lg hover:shadow-[#1565C0]/10"
                        >
                          {/* Frame thumbnail */}
                          <div className="relative h-24 w-full bg-[#1E3048]/50">
                            {!imageErrors[match.id] ? (
                              <Image
                                src={getMatchFrameUrl(match)}
                                alt={`Frame at ${formatTimestamp(match.timestamp)}`}
                                fill
                                className="object-cover"
                                sizes="160px"
                                onError={() =>
                                  setImageErrors((p) => ({
                                    ...p,
                                    [match.id]: true,
                                  }))
                                }
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Video className="h-6 w-6 text-[#5A7A9A]" />
                              </div>
                            )}
                            {/* Play overlay */}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/card:opacity-100">
                              <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                                <Play className="h-4 w-4 fill-white text-white" />
                              </div>
                            </div>
                            {/* Similarity badge */}
                            <span
                              className={cn(
                                'absolute top-1.5 right-1.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                similarityColor(match.similarity),
                              )}
                            >
                              {Math.round(match.similarity * 100)}%
                            </span>
                            {/* Sighting index */}
                            <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/80">
                              #{idx + 1}
                            </span>
                          </div>
                          {/* Card body */}
                          <div className="space-y-1 px-2.5 py-2">
                            <div className="flex items-center gap-1 text-[#60A5FA]">
                              <Clock className="h-3 w-3 shrink-0" />
                              <span className="text-xs font-semibold">
                                {formatTimestamp(match.timestamp)}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#5A7A9A]">
                              {formatTimestampLong(match.timestamp)}
                            </p>
                            {/* Similarity bar */}
                            <div className="mt-1 h-1 w-full rounded-full bg-[#1E3048]">
                              <div
                                className={cn(
                                  'h-full rounded-full transition-all',
                                  similarityBarColor(match.similarity),
                                )}
                                style={{
                                  width: `${Math.round(match.similarity * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Photo matches section */}
              {photoMatches.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628]">
                  <div className="flex items-center gap-3 border-b border-[#1E3048] bg-[#0A0F1E]/60 px-4 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                      <ImageIcon className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#E8EDF5]">
                        Photo Matches
                      </p>
                      <p className="text-[11px] text-[#5A7A9A]">
                        {photoMatches.length} photo
                        {photoMatches.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
                    {[...photoMatches]
                      .sort((a, b) => b.similarity - a.similarity)
                      .map((match) => (
                        <div
                          key={match.id}
                          className="group/photo overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E]"
                        >
                          <div className="relative aspect-square">
                            <Image
                              src={getMatchFrameUrl(match)}
                              alt={match.media_source.filename}
                              fill
                              className="object-cover"
                              sizes="(max-width:640px) 50vw, 25vw"
                              onError={() =>
                                setImageErrors((p) => ({
                                  ...p,
                                  [match.id]: true,
                                }))
                              }
                            />
                            <span
                              className={cn(
                                'absolute top-1.5 right-1.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold',
                                similarityColor(match.similarity),
                              )}
                            >
                              {Math.round(match.similarity * 100)}%
                            </span>
                          </div>
                          <div className="px-2.5 py-2">
                            <p className="truncate text-[11px] text-[#E8EDF5]">
                              {match.media_source.filename}
                            </p>
                            <div className="mt-1.5 h-1 w-full rounded-full bg-[#1E3048]">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  similarityBarColor(match.similarity),
                                )}
                                style={{
                                  width: `${Math.round(match.similarity * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Grid view ── */}
          {results.length > 0 && resultView === 'grid' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedResults.map((match) => (
                <div
                  key={match.id}
                  className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] transition-colors hover:border-[#1565C0]/40"
                >
                  {/* Thumbnail */}
                  <div
                    className={cn(
                      'relative aspect-video bg-[#1E3048]/50',
                      match.media_source.media_type === 'video' &&
                        'group/item cursor-pointer',
                    )}
                    onClick={() => {
                      if (match.media_source.media_type === 'video') {
                        setSelectedVideo({
                          url: `${BACKEND_URL}/${match.media_source.filepath}`,
                          timestamp: match.timestamp,
                          filename: match.media_source.filename,
                        });
                      }
                    }}
                  >
                    {match.media_source.media_type === 'video' &&
                    imageErrors[match.id] ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <Video className="h-10 w-10 text-[#5A7A9A] transition-colors group-hover/item:text-[#60A5FA]" />
                        <span className="text-[10px] text-[#5A7A9A]">
                          Click to play video
                        </span>
                      </div>
                    ) : (
                      <div className="relative h-full w-full">
                        <Image
                          src={getMatchFrameUrl(match)}
                          alt={match.media_source.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          onError={() =>
                            setImageErrors((prev) => ({
                              ...prev,
                              [match.id]: true,
                            }))
                          }
                        />
                        {match.media_source.media_type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/item:opacity-100">
                            <div className="rounded-full bg-white/20 p-3 backdrop-blur-sm">
                              <Play className="h-5 w-5 fill-white text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* Similarity badge */}
                    <div
                      className={cn(
                        'absolute top-2 right-2 z-10 rounded-full px-2.5 py-1 text-xs font-bold',
                        similarityColor(match.similarity),
                      )}
                    >
                      {Math.round(match.similarity * 100)}%
                    </div>
                    {/* Media type tag */}
                    <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
                      {match.media_source.media_type === 'video' ? (
                        <Video className="h-3 w-3" />
                      ) : (
                        <ImageIcon className="h-3 w-3" />
                      )}
                      {match.media_source.media_type}
                    </div>
                  </div>

                  {/* Match details */}
                  <div className="space-y-2 p-3">
                    <p className="truncate text-sm font-medium text-[#E8EDF5]">
                      {match.media_source.filename}
                    </p>

                    {/* Similarity bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-[#5A7A9A]">
                        <span>Similarity</span>
                        <span className="font-semibold text-[#E8EDF5]">
                          {Math.round(match.similarity * 100)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#1E3048]">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            similarityBarColor(match.similarity),
                          )}
                          style={{
                            width: `${Math.round(match.similarity * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Timestamp */}
                    {match.timestamp !== null && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-[#1E3048] px-2.5 py-1.5">
                        <Clock className="h-3 w-3 shrink-0 text-[#60A5FA]" />
                        <span className="text-xs font-semibold text-[#60A5FA]">
                          {formatTimestamp(match.timestamp)}
                        </span>
                        <span className="text-[10px] text-[#5A7A9A]">
                          · {formatTimestampLong(match.timestamp)} into video
                        </span>
                      </div>
                    )}

                    {/* Video play button */}
                    {match.media_source.media_type === 'video' && (
                      <button
                        onClick={() =>
                          setSelectedVideo({
                            url: `${BACKEND_URL}/${match.media_source.filepath}`,
                            timestamp: match.timestamp,
                            filename: match.media_source.filename,
                          })
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#1565C0]/30 bg-[#1565C0]/10 py-1.5 text-xs font-medium text-[#60A5FA] transition-colors hover:bg-[#1565C0]/20"
                      >
                        <Play className="h-3 w-3 fill-current" />
                        Play from {formatTimestamp(match.timestamp)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════ Video Playback Modal ════════ */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0D1628] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-[#1E3048] px-4 py-3">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-purple-400" />
                <span className="max-w-xs truncate text-sm font-medium text-[#E8EDF5]">
                  {selectedVideo.filename}
                </span>
                {selectedVideo.timestamp !== null && (
                  <span className="flex items-center gap-1 rounded-full bg-[#1565C0]/20 px-2 py-0.5 text-[10px] font-semibold text-[#60A5FA]">
                    <Clock className="h-3 w-3" />
                    {formatTimestamp(selectedVideo.timestamp)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="rounded-lg p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Video */}
            <video
              src={
                selectedVideo.timestamp !== null
                  ? `${selectedVideo.url}#t=${selectedVideo.timestamp}`
                  : selectedVideo.url
              }
              controls
              autoPlay
              className="w-full bg-black"
            />

            {selectedVideo.timestamp !== null && (
              <div className="flex items-center justify-center gap-2 border-t border-[#1E3048] px-4 py-2.5 text-xs text-[#5A7A9A]">
                <Clock className="h-3.5 w-3.5 text-[#60A5FA]" />
                Jumped to matched timestamp:{' '}
                <span className="font-semibold text-[#60A5FA]">
                  {formatTimestampLong(selectedVideo.timestamp)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════ History Drawer ════════ */}
      <HistoryDrawer
        open={historyOpen}
        history={history}
        loading={historyLoading}
        onClose={() => setHistoryOpen(false)}
        onRefresh={fetchHistory}
        onSelectSession={(item) => {
          setHistoryOpen(false);
          handleSelectHistory(item);
        }}
      />

      {/* ════════ Delete All Confirmation Modal ════════ */}
      {showDeleteAllModal && (
        <DeleteAllModal
          count={media.length}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowDeleteAllModal(false)}
        />
      )}

      {/* ════════ Media Preview Modal (Google Drive style) ════════ */}
      {previewIndex !== null && previewableMedia[previewIndex] && (
        <MediaPreviewModal
          mediaList={previewableMedia}
          currentIndex={previewIndex}
          onIndexChange={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}

// ── Media upload component (supports multiple files) ──
function MediaUploadSection({
  uploading,
  onUpload,
}: {
  uploading: boolean;
  onUpload: (files: File[], type: 'photo' | 'video') => void;
}) {
  const [mediaType, setMediaType] = useState<'photo' | 'video'>('photo');

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length > 0) onUpload(accepted, mediaType);
    },
    [onUpload, mediaType],
  );

  const accept: Record<string, string[]> =
    mediaType === 'photo'
      ? { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }
      : { 'video/*': ['.mp4', '.mov', '.avi', '.mkv'] };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    disabled: uploading,
  });

  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#E8EDF5]">Upload Media</h2>
        <div className="flex rounded-md border border-[#1E3048]">
          {(['photo', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMediaType(t)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                mediaType === t
                  ? 'bg-[#1565C0] text-white'
                  : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                t === 'photo' ? 'rounded-l-md' : 'rounded-r-md',
              )}
            >
              {t === 'photo' ? (
                <ImageIcon className="h-3 w-3" />
              ) : (
                <Video className="h-3 w-3" />
              )}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div
        {...getRootProps()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors',
          uploading && 'pointer-events-none opacity-50',
          isDragActive
            ? 'border-[#1565C0] bg-[#1565C0]/10'
            : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-[#60A5FA]" />
        ) : (
          <Upload
            className={cn(
              'h-8 w-8',
              isDragActive ? 'text-[#60A5FA]' : 'text-[#5A7A9A]',
            )}
          />
        )}
        <p className="text-center text-sm text-[#5A7A9A]">
          {uploading
            ? 'Uploading & indexing...'
            : `Drop ${mediaType === 'photo' ? 'photos' : 'videos'} here or click to browse`}
        </p>
      </div>
    </div>
  );
}

// ── Selfie upload component ──
function SelfieUpload({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) onChange(accepted[0]);
    },
    [onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
  });

  if (file) {
    const preview = URL.createObjectURL(file);
    return (
      <div className="flex items-center gap-3 rounded-lg border border-[#1565C0]/40 bg-[#1565C0]/5 px-4 py-3">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Selfie preview"
            className="h-full w-full object-cover"
          />
        </div>
        <span className="flex-1 truncate text-sm text-[#E8EDF5]">
          {file.name}
        </span>
        <button
          onClick={() => onChange(null)}
          className="text-[#5A7A9A] transition-colors hover:text-[#E8EDF5]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 transition-colors',
        isDragActive
          ? 'border-[#1565C0] bg-[#1565C0]/10'
          : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/30',
      )}
    >
      <input {...getInputProps()} />
      <Search
        className={cn(
          'h-8 w-8',
          isDragActive ? 'text-[#60A5FA]' : 'text-[#5A7A9A]',
        )}
      />
      <p className="text-center text-sm text-[#5A7A9A]">
        Drop a clear selfie here or click to browse
      </p>
    </div>
  );
}

// ── History Drawer ────────────────────────────────────────────────────────────

/** Derive photo vs. video counts from matched_images paths (by extension) */
function splitMatchCounts(matchedImages: string[], totalMatches: number) {
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const videoCount = matchedImages.filter((p) =>
    videoExts.some((ext) => p.toLowerCase().endsWith(ext)),
  ).length;
  const photoCount = matchedImages.length - videoCount;
  // If matched_images is empty but total_matches > 0, show total only
  if (matchedImages.length === 0 && totalMatches > 0) {
    return { photoCount: 0, videoCount: 0, totalOnly: true };
  }
  return { photoCount, videoCount, totalOnly: false };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function HistoryDrawer({
  open,
  history,
  loading,
  onClose,
  onRefresh,
  onSelectSession,
}: {
  open: boolean;
  history: SessionHistoryItem[];
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onSelectSession: (item: SessionHistoryItem) => void;
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
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#1565C0]/20 bg-[#1565C0]/10">
              <History className="h-4 w-4 text-[#60A5FA]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#E8EDF5]">
                Search History
              </p>
              <p className="text-[10px] text-[#5A7A9A]">
                {history.length} session{history.length !== 1 ? 's' : ''}
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

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0D1628]">
                <History className="h-6 w-6 text-[#5A7A9A]/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#E8EDF5]">
                  No searches yet
                </p>
                <p className="mt-0.5 text-xs text-[#5A7A9A]">
                  Your past searches will appear here.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {history.map((item) => {
                const { photoCount, videoCount, totalOnly } = splitMatchCounts(
                  item.matched_images,
                  item.total_matches,
                );
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectSession(item)}
                    className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1E3048]/50"
                  >
                    {/* Selfie avatar */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border-2 border-[#1E3048] bg-[#0D1628] transition-colors group-hover:border-[#1565C0]/50">
                      {item.selfie_path ? (
                        <Image
                          src={`${BACKEND_URL}/${item.selfie_path}`}
                          alt="Reference selfie"
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <UserCircle2 className="h-6 w-6 text-[#5A7A9A]" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {/* Name + status */}
                      <div className="flex items-center gap-2">
                        <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                          {item.user?.first_name
                            ? `${item.user.first_name} ${item.user.last_name}`
                            : 'Search Session'}
                        </p>
                        <StatusBadge status={item.status} />
                      </div>

                      {/* Date + threshold */}
                      <p className="text-[10px] text-[#5A7A9A]">
                        {formatDate(item.created_at)}
                        &nbsp;·&nbsp;threshold{' '}
                        {Math.round(item.threshold * 100)}%
                      </p>

                      {/* Match count chips */}
                      <div className="flex items-center gap-1.5">
                        {totalOnly ? (
                          <span className="flex items-center gap-1 rounded-md bg-[#1565C0]/10 px-2 py-0.5">
                            <ScanFace className="h-3 w-3 text-[#60A5FA]" />
                            <span className="text-[10px] font-semibold text-[#60A5FA]">
                              {item.total_matches} match
                              {item.total_matches !== 1 ? 'es' : ''}
                            </span>
                          </span>
                        ) : (
                          <>
                            {photoCount > 0 && (
                              <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5">
                                <ImageIcon className="h-3 w-3 text-emerald-400" />
                                <span className="text-[10px] font-semibold text-emerald-400">
                                  {photoCount}
                                </span>
                              </span>
                            )}
                            {videoCount > 0 && (
                              <span className="flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5">
                                <Film className="h-3 w-3 text-purple-400" />
                                <span className="text-[10px] font-semibold text-purple-400">
                                  {videoCount}
                                </span>
                              </span>
                            )}
                            {photoCount === 0 &&
                              videoCount === 0 &&
                              item.total_matches > 0 && (
                                <span className="flex items-center gap-1 rounded-md bg-[#1565C0]/10 px-2 py-0.5">
                                  <ScanFace className="h-3 w-3 text-[#60A5FA]" />
                                  <span className="text-[10px] font-semibold text-[#60A5FA]">
                                    {item.total_matches}
                                  </span>
                                </span>
                              )}
                            {item.total_matches === 0 && (
                              <span className="text-[10px] text-[#5A7A9A]/60">
                                No matches
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#60A5FA]" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer footer hint */}
        <div className="border-t border-[#1E3048] px-5 py-3">
          <p className="text-center text-[10px] text-[#5A7A9A]">
            Click any session to load its results
          </p>
        </div>
      </div>
    </>
  );
}

// ── Google Drive Style Media Preview Modal ──
function MediaPreviewModal({
  mediaList,
  currentIndex,
  onIndexChange,
  onClose,
}: {
  mediaList: MediaSource[];
  currentIndex: number;
  onIndexChange: (idx: number) => void;
  onClose: () => void;
}) {
  const item = mediaList[currentIndex];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (currentIndex > 0) onIndexChange(currentIndex - 1);
      } else if (e.key === 'ArrowRight') {
        if (currentIndex < mediaList.length - 1)
          onIndexChange(currentIndex + 1);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, mediaList, onIndexChange, onClose]);

  if (!item) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < mediaList.length - 1;

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex flex-col bg-black/95 text-white select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 border-l border-white/10 pl-3">
            {item.media_type === 'video' ? (
              <Film className="h-4 w-4 text-red-400" />
            ) : (
              <ImageIcon className="h-4 w-4 text-emerald-400" />
            )}
            <span className="max-w-xs truncate text-sm font-medium md:max-w-md">
              {item.filename}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`${BACKEND_URL}/${item.filepath}`}
            download={item.filename}
            className="flex items-center justify-center rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Download"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Download className="h-5 w-5" />
          </a>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative flex flex-1 items-center justify-center p-4 md:p-12">
        {/* Left Arrow Button */}
        {hasPrev && (
          <button
            onClick={() => onIndexChange(currentIndex - 1)}
            className="absolute left-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/80 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Right Arrow Button */}
        {hasNext && (
          <button
            onClick={() => onIndexChange(currentIndex + 1)}
            className="absolute right-4 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/80 backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white active:scale-95"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Media Content Display */}
        <div className="relative flex max-h-full max-w-full items-center justify-center">
          {item.media_type === 'photo' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${BACKEND_URL}/${item.filepath}`}
              alt={item.filename}
              className="pointer-events-none max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          ) : (
            <video
              key={item.id}
              src={`${BACKEND_URL}/${item.filepath}`}
              controls
              autoPlay
              className="max-h-[80vh] max-w-full rounded-lg shadow-2xl"
            />
          )}
        </div>
      </div>

      {/* Footer Info / Index tracker */}
      <div className="border-t border-white/5 bg-black/40 py-2.5 text-center text-xs text-white/50">
        {currentIndex + 1} / {mediaList.length}
      </div>
    </div>
  );
}

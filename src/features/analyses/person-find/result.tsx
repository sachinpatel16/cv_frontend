'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Search,
  ImageIcon,
  Video,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Film,
  ScanFace,
  History,
  RotateCcw,
  X,
  ChevronRight,
  UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { getSessionMatches, getSessionHistory } from '@/lib/api/peoplefind';
import { ApiError } from '@/types/api';
import type {
  ResultComponentProps,
  SearchMatch,
  SessionHistoryItem,
} from '@/features/analyses/types';
import { useResultTab } from '../shared/ResultShell';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
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

function splitMatchCounts(matchedImages: string[], totalMatches: number) {
  const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
  const videoCount = matchedImages.filter((p) =>
    videoExts.some((ext) => p.toLowerCase().endsWith(ext)),
  ).length;
  const photoCount = matchedImages.length - videoCount;
  if (matchedImages.length === 0 && totalMatches > 0) {
    return { photoCount: 0, videoCount: 0, totalOnly: true };
  }
  return { photoCount, videoCount, totalOnly: false };
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

// ── Result Component ──────────────────────────────────────────────────────────

export default function PersonFindResult({ sessionId }: ResultComponentProps) {
  const activeTab = useResultTab() as string;
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Video playback modal
  const [selectedVideo, setSelectedVideo] = useState<{
    url: string;
    timestamp: number | null;
    filename: string;
  } | null>(null);

  // History drawer
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(sessionId);

  // ── Fetch results ──
  const fetchResults = useCallback(async (sid: string) => {
    try {
      const res = await getSessionMatches(sid);
      setResults(res.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
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
    fetchResults(activeSessionId);
  }, [activeSessionId, fetchResults]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchHistory();
  }, [fetchHistory]);

  // Poll if no results yet
  useEffect(() => {
    if (results.length > 0 || !loading) return;

    const interval = setInterval(() => {
      fetchResults(activeSessionId);
    }, 3000);

    const timeout = setTimeout(() => clearInterval(interval), 120_000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [results, loading, activeSessionId, fetchResults]);

  // ── Load history session ──
  async function handleSelectHistory(item: SessionHistoryItem) {
    setHistoryOpen(false);
    setLoading(true);
    setResults([]);
    setActiveSessionId(item.id);
    try {
      const res = await getSessionMatches(item.id);
      setResults(res.data);
      toast.success(
        res.data.length > 0
          ? `Loaded ${res.data.length} match(es) from history`
          : 'Session loaded — no matches recorded',
      );
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
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

  // ── Derived data ──
  const videoMatches = results.filter(
    (r) => r.media_source.media_type === 'video',
  );
  const photoMatches = results.filter(
    (r) => r.media_source.media_type === 'photo',
  );

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

  // ── Loading state ──
  if (loading && results.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#5A7A9A]" />
          <p className="mt-3 text-sm text-[#5A7A9A]">Loading results…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Summary bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] px-5 py-4">
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

        <div className="flex flex-1 items-center justify-end gap-2">
          {/* History trigger */}
          <button
            onClick={() => {
              setHistoryOpen(!historyOpen);
              fetchHistory();
            }}
            className="relative flex items-center gap-2 rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3 py-2 text-xs font-medium text-[#5A7A9A] transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048] hover:text-[#E8EDF5]"
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
      </div>

      {/* ── Empty state ── */}
      {results.length === 0 && (
        <div className="flex h-48 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <div className="text-center">
            <Search className="mx-auto h-8 w-8 text-[#5A7A9A]" />
            <p className="mt-2 text-sm text-[#5A7A9A]">
              No matches found. Try lowering the threshold.
            </p>
          </div>
        </div>
      )}

      {/* ── Timeline view ── */}
      {results.length > 0 && activeTab === 'timeline' && (
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
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-xs font-bold',
                      similarityColor(bestSim),
                    )}
                  >
                    Best {Math.round(bestSim * 100)}%
                  </span>
                </div>

                {/* Horizontal scrubber timeline */}
                <div className="relative px-4 py-4">
                  <p className="mb-3 text-[10px] font-medium tracking-wider text-[#5A7A9A] uppercase">
                    Timeline — click a marker to scroll to instance
                  </p>
                  <div className="relative h-2 rounded-full bg-[#1E3048]">
                    {(() => {
                      const maxTs =
                        Math.max(...sorted.map((m) => m.timestamp ?? 0)) || 1;
                      const groups = groupTimelineMatches(sorted);
                      return groups.map((group) => {
                        const startPct = (group.startTimestamp / maxTs) * 100;
                        const endPct = (group.endTimestamp / maxTs) * 100;
                        const isRange =
                          group.endTimestamp > group.startTimestamp;

                        if (isRange) {
                          const leftPct = Math.min(startPct, 98);
                          const rightPct = Math.min(endPct, 100);
                          const widthPct = Math.max(rightPct - leftPct, 1.5);

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
                  <div className="mt-1 flex justify-between text-[9px] text-[#5A7A9A]/60">
                    <span>0:00</span>
                    {sorted.length > 0 &&
                      sorted[sorted.length - 1].timestamp !== null && (
                        <span>
                          {formatTimestamp(sorted[sorted.length - 1].timestamp)}
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
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/card:opacity-100">
                          <div className="rounded-full bg-white/20 p-2 backdrop-blur-sm">
                            <Play className="h-4 w-4 fill-white text-white" />
                          </div>
                        </div>
                        <span
                          className={cn(
                            'absolute top-1.5 right-1.5 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold',
                            similarityColor(match.similarity),
                          )}
                        >
                          {Math.round(match.similarity * 100)}%
                        </span>
                        <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/80">
                          #{idx + 1}
                        </span>
                      </div>
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
                      className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0A0F1E]"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={getMatchFrameUrl(match)}
                          alt={match.media_source.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width:640px) 50vw, 25vw"
                          onError={() =>
                            setImageErrors((p) => ({ ...p, [match.id]: true }))
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
      {results.length > 0 && activeTab === 'results' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedResults.map((match) => (
            <div
              key={match.id}
              className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] transition-colors hover:border-[#1565C0]/40"
            >
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
                <div
                  className={cn(
                    'absolute top-2 right-2 z-10 rounded-full px-2.5 py-1 text-xs font-bold',
                    similarityColor(match.similarity),
                  )}
                >
                  {Math.round(match.similarity * 100)}%
                </div>
                <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[10px] text-white/80 backdrop-blur-sm">
                  {match.media_source.media_type === 'video' ? (
                    <Video className="h-3 w-3" />
                  ) : (
                    <ImageIcon className="h-3 w-3" />
                  )}
                  {match.media_source.media_type}
                </div>
              </div>

              <div className="space-y-2 p-3">
                <p className="truncate text-sm font-medium text-[#E8EDF5]">
                  {match.media_source.filename}
                </p>
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

      {/* ── Raw JSON view ── */}
      {results.length > 0 && activeTab === 'raw' && (
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <p className="mb-3 text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
            Raw Detection Matches (JSON)
          </p>
          <pre className="scrollbar-thin max-h-96 overflow-auto rounded-lg bg-[#0A0F1E] p-4 font-mono text-xs text-[#60A5FA]">
            {JSON.stringify(results, null, 2)}
          </pre>
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
      <>
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
            historyOpen
              ? 'pointer-events-auto opacity-100'
              : 'pointer-events-none opacity-0',
          )}
          onClick={() => setHistoryOpen(false)}
        />

        {/* Panel */}
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
                  Search History
                </p>
                <p className="text-[10px] text-[#5A7A9A]">
                  {history.length} session{history.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchHistory}
                disabled={historyLoading}
                className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
                title="Refresh"
              >
                <RotateCcw
                  className={cn('h-4 w-4', historyLoading && 'animate-spin')}
                />
              </button>
              <button
                onClick={() => setHistoryOpen(false)}
                className="rounded-lg p-2 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {historyLoading ? (
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
                    No History
                  </p>
                  <p className="mt-1 text-xs text-[#5A7A9A]">
                    There is no history of any analysis done.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#1E3048]">
                {history.map((item) => {
                  const { photoCount, videoCount, totalOnly } =
                    splitMatchCounts(item.matched_images, item.total_matches);
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectHistory(item)}
                      className="group flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[#1E3048]/50"
                    >
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

                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                            {item.user?.first_name
                              ? `${item.user.first_name} ${item.user.last_name}`
                              : 'Search Session'}
                          </p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-[10px] text-[#5A7A9A]">
                          {formatDate(item.created_at)}
                          &nbsp;·&nbsp;threshold{' '}
                          {Math.round(item.threshold * 100)}%
                        </p>
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

                      <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 transition-all group-hover:translate-x-0.5 group-hover:text-[#60A5FA]" />
                    </button>
                  );
                })}
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
    </div>
  );
}

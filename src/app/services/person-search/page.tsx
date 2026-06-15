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
} from '@/lib/api/peoplefind';
import { ApiError } from '@/types/api';
import type {
  MediaSource,
  SearchSession,
  SearchMatch,
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

// ── Main page ──
export default function PersonSearchPage() {
  const [tab, setTab] = useState<Tab>('library');

  // Media library state
  const [media, setMedia] = useState<MediaSource[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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
  } | null>(null);

  const fetchMedia = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setMediaLoading(true);
    }
    try {
      const res = await listMedia();
      setMedia(res.data);
    } catch {
      // silently fail on initial load
    } finally {
      setMediaLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMedia(false);
  }, [fetchMedia]);

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
    if (!confirm('Delete all media? This cannot be undone.')) return;
    try {
      await bulkDeleteMedia();
      toast.success('All media deleted');
      setMedia([]);
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
      // Poll for results
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
        // If we got results, stop polling
        if (res.data.length > 0) {
          clearInterval(interval);
          toast.success(`Found ${res.data.length} match(es)`);
        }
      } catch {
        clearInterval(interval);
      }
    }, 3000);
    // Safety: stop after 2 minutes
    setTimeout(() => clearInterval(interval), 120_000);
  }

  function formatTimestamp(seconds: number | null): string {
    if (seconds === null) return '—';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  function getMatchImageUrl(match: SearchMatch): string {
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
      const timeFilename = `${hh}_${mm}_${ss}`;
      return `${BACKEND_URL}/storage/video_matches/${match.session_id}/frame_${timeFilename}.jpg`;
    }
    return `${BACKEND_URL}/${match.media_source.filepath}`;
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#E8EDF5]">Person Search</h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Find anyone across your media using face recognition.
        </p>
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
                    onClick={handleBulkDelete}
                    className="rounded-md p-1.5 text-red-400/60 transition-colors hover:bg-red-400/10 hover:text-red-400"
                    title="Delete all"
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
                    {item.media_type === 'photo' ? (
                      <div className="relative aspect-square">
                        <Image
                          src={`${BACKEND_URL}/${item.filepath}`}
                          alt={item.filename}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-square items-center justify-center bg-[#1E3048]/50">
                        <Video className="h-8 w-8 text-[#5A7A9A]" />
                      </div>
                    )}
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
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-[#5A7A9A]" />
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
      )}

      {/* ════════ Tab: Results ════════ */}
      {tab === 'results' && (
        <div className="space-y-4">
          {/* Session info */}
          {session && (
            <div className="flex items-center gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] px-5 py-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-[#1565C0]">
                <Image
                  src={`${BACKEND_URL}/${session.selfie_path}`}
                  alt="Reference selfie"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-[#E8EDF5]">
                  Search Session
                </p>
                <p className="text-xs text-[#5A7A9A]">
                  Threshold: {Math.round(session.threshold * 100)}% · Status:{' '}
                  <StatusBadge status={session.status} />
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-lg font-bold text-[#E8EDF5]">
                  {results.length}
                </p>
                <p className="text-xs text-[#5A7A9A]">
                  match{results.length !== 1 ? 'es' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Results grid */}
          {results.length === 0 ? (
            <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
              <div className="text-center">
                <Search className="mx-auto h-8 w-8 text-[#5A7A9A]" />
                <p className="mt-2 text-sm text-[#5A7A9A]">
                  {session
                    ? 'No matches found. Try lowering the threshold.'
                    : 'Run a search to see results here.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results
                .sort((a, b) => b.similarity - a.similarity)
                .map((match) => (
                  <div
                    key={match.id}
                    className="overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] transition-colors hover:border-[#1565C0]/40"
                  >
                    {/* Source image / Video keyframe match */}
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
                            src={getMatchImageUrl(match)}
                            alt={match.media_source.filename}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            onError={() => {
                              setImageErrors((prev) => ({
                                ...prev,
                                [match.id]: true,
                              }));
                            }}
                          />
                          {match.media_source.media_type === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover/item:opacity-100">
                              <span className="rounded-md bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                                Play video
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Similarity badge */}
                      <div
                        className={cn(
                          'absolute top-2 right-2 z-10 rounded-full px-2.5 py-1 text-xs font-bold',
                          match.similarity >= 0.8
                            ? 'bg-emerald-500/90 text-white'
                            : match.similarity >= 0.6
                              ? 'bg-[#F59E0B]/90 text-white'
                              : 'bg-[#5A7A9A]/90 text-white',
                        )}
                      >
                        {Math.round(match.similarity * 100)}%
                      </div>
                    </div>

                    {/* Match details */}
                    <div className="space-y-1.5 p-3">
                      <p className="truncate text-sm font-medium text-[#E8EDF5]">
                        {match.media_source.filename}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[#5A7A9A]">
                        <span className="flex items-center gap-1">
                          {match.media_source.media_type === 'photo' ? (
                            <ImageIcon className="h-3 w-3" />
                          ) : (
                            <Video className="h-3 w-3" />
                          )}
                          {match.media_source.media_type}
                        </span>
                        {match.timestamp !== null && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimestamp(match.timestamp)}
                          </span>
                        )}
                      </div>
                      {match.bbox && (
                        <p className="text-[10px] text-[#5A7A9A]/60">
                          bbox: [{match.bbox.join(', ')}]
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="relative w-full max-w-3xl rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 shadow-2xl">
            <button
              onClick={() => setSelectedVideo(null)}
              className="absolute -top-10 right-0 flex items-center gap-1 text-sm text-[#5A7A9A] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" /> Close
            </button>
            <video
              src={
                selectedVideo.timestamp !== null
                  ? `${selectedVideo.url}#t=${selectedVideo.timestamp}`
                  : selectedVideo.url
              }
              controls
              autoPlay
              className="w-full rounded-lg"
            />
            {selectedVideo.timestamp !== null && (
              <p className="mt-2 text-center text-xs text-[#5A7A9A]">
                Playing from matched time:{' '}
                {formatTimestamp(selectedVideo.timestamp)}
              </p>
            )}
          </div>
        </div>
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

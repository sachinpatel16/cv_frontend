'use client';

import { useEffect, useState } from 'react';
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
import { usePersonSearchStore } from '@/stores/personSearchStore';
import { StatusBadge } from '@/components/services/shared/StatusBadge';
import type { MediaSource, SearchMatch } from '@/types/peoplefind';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

type Tab = 'library' | 'search' | 'results';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'library', label: 'Media Library', icon: ImageIcon },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'results', label: 'Results', icon: CheckCircle2 },
];

// ── Helpers ──
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ── Delete All Modal ──
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
        <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />
        <div className="space-y-5 p-6">
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
          <div className="flex gap-3 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border border-[#1E3048] px-4 py-2.5 text-sm font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              Delete All Media
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Media Preview Carousel ──
function MediaPreviewCarousel({
  media,
  startIndex,
  onClose,
}: {
  media: MediaSource[];
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const item = media[current];
  if (!item) return null;
  const isVideo = item.media_type === 'video';
  const src = `${BACKEND_URL}/${item.filepath}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0A0F1E] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
          <p className="truncate text-sm font-semibold text-[#E8EDF5]">
            {item.filename}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5A7A9A]">
              {current + 1} / {media.length}
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center overflow-hidden bg-black/60 p-4">
          {isVideo ? (
            <video controls className="max-h-[60vh] max-w-full rounded-lg">
              <source src={src} />
            </video>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={item.filename}
              className="max-h-[60vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
        <div className="flex items-center justify-between border-t border-[#1E3048] px-5 py-3">
          <button
            onClick={() => setCurrent(Math.max(0, current - 1))}
            disabled={current === 0}
            className="flex items-center gap-2 rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={() => setCurrent(Math.min(media.length - 1, current + 1))}
            disabled={current === media.length - 1}
            className="flex items-center gap-2 rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-30"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Media Library Tab ──
function LibraryTab() {
  const {
    media,
    mediaLoading,
    uploading,
    selectedIds,
    deleteAllOpen,
    fetchMedia,
    addMedia,
    removeMedia,
    bulkRemoveMedia,
    toggleSelect,
    clearSelection,
    setDeleteAllOpen,
  } = usePersonSearchStore();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewable = media.filter((m) => m.status === 'completed');

  const { getRootProps: getPhotoProps, getInputProps: getPhotoInputs } =
    useDropzone({
      accept: { 'image/*': [] },
      onDrop: (files) => addMedia(files),
    });

  const { getRootProps: getVideoProps, getInputProps: getVideoInputs } =
    useDropzone({
      accept: { 'video/*': [] },
      onDrop: (files) => addMedia(files),
    });

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Poll for processing media
  useEffect(() => {
    const hasPending = media.some(
      (m) => m.status === 'pending' || m.status === 'processing',
    );
    if (!hasPending) return;
    const timer = setInterval(() => fetchMedia(), 10000);
    return () => clearInterval(timer);
  }, [media, fetchMedia]);

  return (
    <div className="space-y-6">
      {/* Upload zones */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            rootProps: getPhotoProps(),
            inputProps: getPhotoInputs(),
            icon: ImageIcon,
            label: 'Upload Photos',
            sublabel: 'JPG, PNG, WEBP',
          },
          {
            rootProps: getVideoProps(),
            inputProps: getVideoInputs(),
            icon: Film,
            label: 'Upload Videos',
            sublabel: 'MP4, MOV, AVI',
          },
        ].map(({ rootProps, inputProps, icon: Icon, label, sublabel }) => (
          <div
            key={label}
            {...rootProps}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#1E3048] p-8 text-center transition-colors hover:border-[#1565C0]/50 hover:bg-[#1E3048]/20"
          >
            <input {...inputProps} />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-[#5A7A9A]" />
            ) : (
              <Icon className="h-8 w-8 text-[#5A7A9A]" />
            )}
            <div>
              <p className="text-sm font-medium text-[#5A7A9A]">{label}</p>
              <p className="text-xs text-[#5A7A9A]/60">{sublabel}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      {media.length > 0 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[#5A7A9A]">
            <span className="font-semibold text-[#E8EDF5]">{media.length}</span>{' '}
            item{media.length !== 1 ? 's' : ''} in library
          </p>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={clearSelection}
                className="rounded-lg border border-[#1E3048] px-2.5 py-1 text-xs text-[#5A7A9A] hover:bg-[#1E3048]"
              >
                Deselect all
              </button>
            )}
            <button
              onClick={() => setDeleteAllOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-red-500/20 px-2.5 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="h-3 w-3" /> Delete All
            </button>
            <button
              onClick={() => fetchMedia()}
              className="rounded-lg border border-[#1E3048] p-1.5 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {mediaLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
        </div>
      ) : media.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <ImageIcon className="h-10 w-10 text-[#5A7A9A]/30" />
          <p className="text-sm text-[#5A7A9A]">
            No media in library yet. Upload photos or videos above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {media.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            const previewIdx = previewable.findIndex((p) => p.id === item.id);
            return (
              <div
                key={item.id}
                className={cn(
                  'group relative overflow-hidden rounded-xl border transition-all',
                  isSelected
                    ? 'border-[#3B82F6] shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                    : 'border-[#1E3048] hover:border-[#1565C0]/40',
                )}
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video cursor-pointer bg-black/40"
                  onClick={() =>
                    previewIdx !== -1 && setPreviewIndex(previewIdx)
                  }
                >
                  {item.media_type === 'photo' && item.filepath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${BACKEND_URL}/${item.filepath}`}
                      alt={item.filename}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Film className="h-6 w-6 text-[#5A7A9A]" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/40">
                    {item.status === 'completed' && previewIdx !== -1 && (
                      <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                    )}
                  </div>
                  <div className="absolute top-1.5 left-1.5">
                    <StatusBadge status={item.status} />
                  </div>
                  {/* Select checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className="absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded border border-[#1E3048] bg-[#0A0F1E]/80"
                  >
                    {isSelected && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#60A5FA]" />
                    )}
                  </button>
                </div>
                {/* Footer */}
                <div className="flex items-center justify-between gap-1 px-2.5 py-1.5">
                  <p className="min-w-0 truncate text-[10px] text-[#5A7A9A]">
                    {item.filename}
                  </p>
                  <button
                    onClick={() => removeMedia(item.id)}
                    className="shrink-0 text-[#5A7A9A]/60 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {deleteAllOpen && (
        <DeleteAllModal
          count={media.length}
          onConfirm={bulkRemoveMedia}
          onCancel={() => setDeleteAllOpen(false)}
        />
      )}
      {previewIndex !== null && (
        <MediaPreviewCarousel
          media={previewable}
          startIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
        />
      )}
    </div>
  );
}

// ── Search Tab ──
function SearchTab() {
  const {
    selfieFile,
    selfiePreview,
    similarity,
    maxResults,
    searching,
    setSelfie,
    setSimilarity,
    setMaxResults,
    runSearch,
    media,
  } = usePersonSearchStore();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: ([file]) => {
      if (!file) return;
      setSelfie(file, URL.createObjectURL(file));
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Selfie upload */}
        <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <p className="text-sm font-semibold text-[#E8EDF5]">
            Reference Selfie
          </p>
          <div
            {...getRootProps()}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors',
              isDragActive
                ? 'border-[#1565C0] bg-[#1565C0]/5'
                : 'border-[#1E3048] hover:border-[#1565C0]/50 hover:bg-[#1E3048]/20',
            )}
          >
            <input {...getInputProps()} />
            {selfiePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selfiePreview}
                alt="Selfie preview"
                className="h-32 w-32 rounded-full border-4 border-[#1565C0]/40 object-cover shadow-xl"
              />
            ) : (
              <>
                <ScanFace className="h-10 w-10 text-[#5A7A9A]" />
                <p className="text-sm text-[#5A7A9A]">
                  Drop a clear face photo here
                </p>
              </>
            )}
            {selfieFile && (
              <p className="text-xs text-[#5A7A9A]/70">
                {selfieFile.name} · click to replace
              </p>
            )}
          </div>
        </div>

        {/* Config */}
        <div className="space-y-5 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          <p className="text-sm font-semibold text-[#E8EDF5]">
            Search Configuration
          </p>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-[#5A7A9A]">
                Similarity Threshold
              </label>
              <span className="text-xs font-bold text-[#60A5FA]">
                {(similarity * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0.4}
              max={0.99}
              step={0.01}
              value={similarity}
              onChange={(e) => setSimilarity(parseFloat(e.target.value))}
              className="w-full accent-[#1565C0]"
            />
            <p className="mt-1 text-[10px] text-[#5A7A9A]">
              Higher = stricter matching (default 60%)
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-medium text-[#5A7A9A]">
                Max Results
              </label>
              <span className="text-xs font-bold text-[#60A5FA]">
                {maxResults}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={maxResults}
              onChange={(e) => setMaxResults(parseInt(e.target.value))}
              className="w-full accent-[#1565C0]"
            />
          </div>
          <div className="rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-4 py-3">
            <p className="text-xs text-[#5A7A9A]">
              Searching across{' '}
              <span className="font-semibold text-[#E8EDF5]">
                {media.length}
              </span>{' '}
              media file{media.length !== 1 ? 's' : ''} in library.
            </p>
          </div>
          <button
            onClick={runSearch}
            disabled={!selfieFile || searching || media.length === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1565C0] py-2.5 text-sm font-semibold text-white hover:bg-[#1976D2] disabled:opacity-50"
          >
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Searching…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Search Library
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History Drawer ──
function HistoryDrawer() {
  const {
    history,
    historyLoading,
    historyOpen,
    loadHistory,
    selectHistorySession,
    setHistoryOpen,
  } = usePersonSearchStore();

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
          'fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-[#1E3048] bg-[#0A0F1E] shadow-2xl transition-transform duration-300',
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
              onClick={loadHistory}
              disabled={historyLoading}
              className="rounded-lg p-2 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5] disabled:opacity-40"
            >
              <RotateCcw
                className={cn('h-4 w-4', historyLoading && 'animate-spin')}
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
          {historyLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-[#5A7A9A]" />
            </div>
          ) : history.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3">
              <History className="h-8 w-8 text-[#5A7A9A]/30" />
              <p className="text-sm text-[#5A7A9A]">No search history yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3048]">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => selectHistorySession(item)}
                  className="group flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-[#1E3048]/50"
                >
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-[#1E3048]">
                    {item.selfie_path ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${BACKEND_URL}/${item.selfie_path}`}
                        alt="selfie"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-[#1E3048]">
                        <UserCircle2 className="h-5 w-5 text-[#5A7A9A]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-[10px] text-[#5A7A9A]">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#5A7A9A]/40 group-hover:text-[#60A5FA]" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Results Tab ──
function ResultsTab() {
  const { session, matches, loadHistory, historyOpen, setHistoryOpen } =
    usePersonSearchStore();
  const [viewMode, setViewMode] = useState<'timeline' | 'grid'>('timeline');
  const [videoPreview, setVideoPreview] = useState<{
    url: string;
    timestamp: number | null;
    filename: string;
  } | null>(null);

  if (!session) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] text-center">
        <Search className="h-10 w-10 text-[#5A7A9A]/30" />
        <div>
          <p className="text-sm font-medium text-[#E8EDF5]">No search yet</p>
          <p className="mt-1 text-xs text-[#5A7A9A]">
            Run a search from the Search tab to see results here.
          </p>
        </div>
      </div>
    );
  }

  const selfieUrl = session.selfie_path
    ? `${BACKEND_URL}/${session.selfie_path}`
    : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#1E3048]">
            {selfieUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selfieUrl}
                alt="selfie"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#1E3048]">
                <UserCircle2 className="h-5 w-5 text-[#5A7A9A]" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E8EDF5]">
              {matches.length} match{matches.length !== 1 ? 'es' : ''} found
            </p>
            <p className="text-[10px] text-[#5A7A9A]">
              Threshold: {((session.threshold ?? 0.6) * 100).toFixed(0)}% ·{' '}
              {formatDate(session.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-0.5">
            {(['timeline', 'grid'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs transition-colors',
                  viewMode === v
                    ? 'bg-[#1565C0] text-white'
                    : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              loadHistory();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E3048] px-3 py-1.5 text-xs text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            <History className="h-3.5 w-3.5" /> History
          </button>
        </div>
      </div>

      {/* Matches */}
      {matches.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628]">
          <AlertCircle className="h-8 w-8 text-[#5A7A9A]/30" />
          <p className="text-sm text-[#5A7A9A]">
            No matches found for this search.
          </p>
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-3">
          {matches.map((match, idx) => (
            <div
              key={match.id ?? idx}
              className="group flex items-center gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 transition-colors hover:border-[#1565C0]/40"
            >
              {/* Thumbnail */}
              <div
                className="relative h-16 w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-[#1E3048] bg-black/60"
                onClick={() => {
                  if (
                    match.media_source?.media_type === 'video' &&
                    match.media_source?.filepath
                  ) {
                    setVideoPreview({
                      url: `${BACKEND_URL}/${match.media_source.filepath}`,
                      timestamp: match.timestamp ?? null,
                      filename: match.media_source.filename ?? '',
                    });
                  }
                }}
              >
                <div className="flex h-full items-center justify-center">
                  {match.media_source?.media_type === 'video' ? (
                    <Film className="h-6 w-6 text-[#5A7A9A]" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-[#5A7A9A]" />
                  )}
                </div>
                <span
                  className={cn(
                    'absolute top-1 right-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold',
                    similarityColor(match.similarity),
                  )}
                >
                  {(match.similarity * 100).toFixed(1)}%
                </span>
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  {match.media_source?.media_type === 'video' ? (
                    <Film className="h-3.5 w-3.5 shrink-0 text-[#5A7A9A]" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#5A7A9A]" />
                  )}
                  <p className="truncate text-xs font-semibold text-[#E8EDF5]">
                    {match.media_source?.filename}
                  </p>
                </div>
                {match.media_source?.media_type === 'video' && (
                  <p className="text-[10px] text-[#5A7A9A]">
                    Timestamp:{' '}
                    <span className="font-mono text-[#E8EDF5]">
                      {formatTimestamp(match.timestamp ?? null)}
                    </span>
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#1E3048]">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        similarityBarColor(match.similarity),
                      )}
                      style={{ width: `${match.similarity * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#E8EDF5]">
                    {(match.similarity * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {matches.map((match, idx) => (
            <div
              key={match.id ?? idx}
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] transition-colors hover:border-[#1565C0]/40"
              onClick={() => {
                if (
                  match.media_source?.media_type === 'video' &&
                  match.media_source?.filepath
                ) {
                  setVideoPreview({
                    url: `${BACKEND_URL}/${match.media_source.filepath}`,
                    timestamp: match.timestamp ?? null,
                    filename: match.media_source.filename ?? '',
                  });
                }
              }}
            >
              <div className="relative aspect-video bg-black/40">
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-6 w-6 text-[#5A7A9A]" />
                </div>
                <span
                  className={cn(
                    'absolute top-1.5 right-1.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold',
                    similarityColor(match.similarity),
                  )}
                >
                  {(match.similarity * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-[10px] text-[#5A7A9A]">
                  {match.media_source?.filename}
                </p>
                {match.timestamp != null && (
                  <p className="font-mono text-[9px] text-[#5A7A9A]/60">
                    {formatTimestamp(match.timestamp)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video preview modal */}
      {videoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setVideoPreview(null)}
        >
          <div
            className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[#1E3048] bg-[#0A0F1E]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#1E3048] px-5 py-3">
              <p className="truncate text-sm font-semibold text-[#E8EDF5]">
                {videoPreview.filename}
              </p>
              <button
                onClick={() => setVideoPreview(null)}
                className="rounded-lg p-1.5 text-[#5A7A9A] hover:bg-[#1E3048]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              <video
                controls
                className="w-full rounded-lg"
                src={videoPreview.url}
              />
            </div>
          </div>
        </div>
      )}

      <HistoryDrawer />
    </div>
  );
}

// ── Main Page ──
export default function PersonSearchPage() {
  const { activeTab, setActiveTab, loadHistory } = usePersonSearchStore();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5]">Person Search</h1>
        <p className="mt-1 text-sm text-[#5A7A9A]">
          Find a person across photos and videos using face recognition.
        </p>
      </div>

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

      {activeTab === 'library' && <LibraryTab />}
      {activeTab === 'search' && <SearchTab />}
      {activeTab === 'results' && <ResultsTab />}
    </div>
  );
}

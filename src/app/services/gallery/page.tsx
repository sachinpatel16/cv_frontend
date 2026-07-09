'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Upload,
  Video as VideoIcon,
  ImageIcon,
  Search,
  Trash2,
  Play,
  Loader2,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  BarChart2,
  Activity,
  Eye,
  CalendarDays,
  Grid,
  Clapperboard,
  MoreVertical,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  listGalleryMedia,
  uploadGalleryMedia,
  deleteGalleryMedia,
  deleteAllGalleryMedia,
  type GalleryMedia,
} from '@/lib/api/gallery';
import { ApiError } from '@/types/api';
import { useInvestigationStore } from '@/stores/investigationStore';

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function GalleryPage() {
  const [media, setMedia] = useState<GalleryMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'video' | 'photo'>(
    'all',
  );
  const [selectedItem, setSelectedItem] = useState<GalleryMedia | null>(null);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [randomCode, setRandomCode] = useState('');
  const [typedCode, setTypedCode] = useState('');

  // Fetch all media
  const fetchMedia = useCallback(async () => {
    try {
      const res = await listGalleryMedia();
      setMedia(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to retrieve gallery files');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      fetchMedia();
    }, 0);
  }, [fetchMedia]);

  // Global click listener to close dropdowns
  useEffect(() => {
    const handleClose = () => {
      setActiveMenuId(null);
      setUploadMenuOpen(false);
    };
    window.addEventListener('click', handleClose);
    return () => window.removeEventListener('click', handleClose);
  }, []);

  // Dropzone for photo uploads
  const onDropPhotos = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      try {
        await uploadGalleryMedia(acceptedFiles, 'photo');
        toast.success(`Successfully uploaded ${acceptedFiles.length} photo(s)`);
        await fetchMedia();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [fetchMedia],
  );

  // Dropzone for video uploads
  const onDropVideos = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      try {
        await uploadGalleryMedia(acceptedFiles, 'video');
        toast.success(`Successfully uploaded ${acceptedFiles.length} video(s)`);
        await fetchMedia();
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [fetchMedia],
  );

  const {
    getRootProps: getPhotoRootProps,
    getInputProps: getPhotoInputProps,
    open: openPhotoDialog,
  } = useDropzone({
    onDrop: onDropPhotos,
    noClick: true,
    accept: { 'image/*': [] },
  });

  const {
    getRootProps: getVideoRootProps,
    getInputProps: getVideoInputProps,
    open: openVideoDialog,
  } = useDropzone({
    onDrop: onDropVideos,
    noClick: true,
    accept: { 'video/*': [] },
  });

  // Handle single deletion
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      !confirm('Are you sure you want to permanently delete this media file?')
    )
      return;

    try {
      await deleteGalleryMedia(id);
      toast.success('Media file deleted from gallery');
      setMedia((prev) => prev.filter((item) => item.id !== id));
      if (selectedItem?.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete');
    }
  };

  // Handle clear gallery
  const handleClearAllConfirm = async () => {
    try {
      await deleteAllGalleryMedia();
      toast.success(
        'Gallery cleared successfully (AWS S3 style purge complete)',
      );
      setMedia([]);
      setSelectedItem(null);
      setDeleteConfirmOpen(false);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : 'Failed to clear gallery',
      );
    }
  };

  // Filter logic
  const filteredMedia = media.filter((item) => {
    const matchesSearch = item.filename
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.media_type === filterType;
    return matchesSearch && matchesType;
  });

  const getMediaUrl = (filepath: string) => {
    const normalized = filepath.replace(/\\/g, '/');
    return `${BACKEND_URL}/${normalized}`;
  };

  return (
    <div className="flex h-[calc(100vh-6.5rem)] gap-6 overflow-hidden text-[#E8EDF5]">
      {/* Hidden Dropzone Inputs */}
      <div {...getPhotoRootProps()}>
        <input {...getPhotoInputProps()} />
      </div>
      <div {...getVideoRootProps()}>
        <input {...getVideoInputProps()} />
      </div>

      {/* Main Grid Section */}
      <div className="flex flex-1 flex-col space-y-6 overflow-hidden">
        {/* Gallery Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#E8EDF5]">
              Centralized Media Gallery
            </h1>
            <p className="mt-1 text-xs text-[#5A7A9A]">
              Upload, organize, and launch custom analytics (Object Count,
              People Analytics, Safety Alerts) on your raw files.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Real Google Drive-like "+ New" Upload Button */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadMenuOpen(!uploadMenuOpen);
                }}
                disabled={uploading}
                className="flex items-center gap-2.5 rounded-full border border-[#1E3048] bg-[#0D1628] px-5 py-2.5 text-xs font-semibold text-[#E8EDF5] shadow-lg transition-all hover:bg-[#1E3048] disabled:opacity-50"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 36 36"
                  className="shrink-0"
                >
                  <path fill="#34A853" d="M16 16v14h4V20z" />
                  <path fill="#4285F4" d="M30 16H20v4h10z" />
                  <path fill="#FBBC05" d="M6 16h10v4H6z" />
                  <path fill="#EA4335" d="M20 16V6h-4v10z" />
                </svg>
                New
              </button>

              {uploadMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-[#1E3048] bg-[#0D1628] p-1.5 shadow-2xl">
                  <button
                    onClick={() => {
                      openPhotoDialog();
                      setUploadMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#E8EDF5] transition-all hover:bg-[#1E3048]"
                  >
                    <ImageIcon className="h-4 w-4 text-[#60A5FA]" />
                    Upload Photos
                  </button>
                  <button
                    onClick={() => {
                      openVideoDialog();
                      setUploadMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-[#E8EDF5] transition-all hover:bg-[#1E3048]"
                  >
                    <VideoIcon className="h-4 w-4 text-red-500" />
                    Upload Videos
                  </button>
                </div>
              )}
            </div>

            {/* Standalone Delete Gallery Button */}
            {media.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const code = `DELETE-GALLERY-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                  setRandomCode(code);
                  setTypedCode('');
                  setDeleteConfirmOpen(true);
                }}
                disabled={uploading}
                className="flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-5 py-2.5 text-xs font-semibold text-red-400 shadow-lg transition-all hover:bg-red-500/25 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Gallery
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-1 rounded-lg bg-[#0A0F1E] p-1">
            {(['all', 'video', 'photo'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={cn(
                  'rounded-md px-3.5 py-1.5 text-xs font-semibold capitalize transition-all',
                  filterType === t
                    ? 'bg-[#1E3048] text-[#E8EDF5] shadow-sm'
                    : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
                )}
              >
                {t}s
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full max-w-xs">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#5A7A9A]" />
            <input
              type="text"
              placeholder="Search files by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-[#1E3048] bg-[#0A0F1E] py-1.5 pr-4 pl-9 text-xs text-[#E8EDF5] placeholder-[#5A7A9A] transition-all outline-none focus:border-[#1565C0]"
            />
          </div>
        </div>

        {/* Media Grid (Bigger boxes: grid-cols-1 to 3/4) */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-60 flex-col items-center justify-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#1565C0]" />
              <p className="text-xs text-[#5A7A9A]">Retrieving files...</p>
            </div>
          ) : uploading ? (
            <div className="flex h-60 flex-col items-center justify-center space-y-3">
              <Loader2 className="h-7 w-7 animate-spin text-[#1565C0]" />
              <p className="text-xs text-[#E8EDF5]">Uploading to gallery...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="flex h-60 flex-col items-center justify-center space-y-4 rounded-xl border border-dashed border-[#1E3048] p-6 text-center">
              <div className="rounded-full bg-[#1E3048]/40 p-4 text-[#5A7A9A]">
                <Grid className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#E8EDF5]">
                  No files found
                </p>
                <p className="mt-1 text-xs text-[#5A7A9A]">
                  Try adjusting your filters or upload new photo and video
                  footage above.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3">
              {filteredMedia.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={cn(
                      'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-[#0D1628] transition-all duration-300 hover:scale-[1.01] hover:shadow-lg',
                      isSelected
                        ? 'border-[#1565C0] bg-[#0F1C36] shadow-[0_0_15px_rgba(21,101,192,0.15)] ring-1 ring-[#1565C0]/50'
                        : 'border-[#1E3048] hover:border-[#2A3E5D]',
                    )}
                  >
                    {/* Header Row (Clapperboard icon + Filename + Ellipsis Menu) */}
                    <div className="flex h-11 items-center justify-between border-b border-[#1E3048]/60 px-3.5 py-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {item.media_type === 'video' ? (
                          <Clapperboard className="h-4 w-4 shrink-0 text-red-500" />
                        ) : (
                          <ImageIcon className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                        )}
                        <p
                          className="truncate text-xs font-semibold text-[#E8EDF5]"
                          title={item.filename}
                        >
                          {item.filename}
                        </p>
                      </div>

                      {/* Card Dropdown Option Options Menu */}
                      <div className="relative ml-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(
                              activeMenuId === item.id ? null : item.id,
                            );
                          }}
                          className="rounded-md p-1.5 text-[#5A7A9A] transition-all hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </button>

                        {activeMenuId === item.id && (
                          <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-[#1E3048] bg-[#0D1628] p-1 text-left shadow-2xl">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center rounded-md px-3 py-2 text-xs font-medium text-[#E8EDF5] transition-all hover:bg-[#1E3048]"
                            >
                              View Details
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item.id, e);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center rounded-md px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/10"
                            >
                              Delete File
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Media Preview Container */}
                    <div className="relative aspect-video w-full overflow-hidden bg-[#050912]">
                      {item.media_type === 'video' ? (
                        <div className="relative h-full w-full">
                          <video
                            src={getMediaUrl(item.filepath)}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                          />
                          <span className="absolute right-2.5 bottom-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">
                            Video
                          </span>
                        </div>
                      ) : (
                        <div className="relative h-full w-full">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getMediaUrl(item.filepath)}
                            alt={item.filename}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                            loading="lazy"
                          />
                          <span className="absolute right-2.5 bottom-2.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white uppercase">
                            Photo
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Details Side Panel (Google Drive Style Panel) */}
      <div
        className={cn(
          'flex w-80 shrink-0 flex-col overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] transition-all duration-300',
          selectedItem ? 'translate-x-0' : 'hidden translate-x-full',
        )}
      >
        {selectedItem && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-[#1E3048] p-4">
              <h2 className="text-xs font-bold tracking-wider text-[#5A7A9A] uppercase">
                File Details
              </h2>
              <button
                onClick={() => setSelectedItem(null)}
                className="rounded-md p-1 text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                ✕
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 space-y-5 overflow-y-auto p-4">
              {/* Media Preview Area */}
              <div className="overflow-hidden rounded-lg border border-[#1E3048] bg-[#0A0F1E]">
                {selectedItem.media_type === 'video' ? (
                  <div className="relative aspect-video w-full bg-[#050912]">
                    <video
                      key={selectedItem.id}
                      controls
                      className="h-full w-full object-contain"
                    >
                      <source
                        src={getMediaUrl(selectedItem.filepath)}
                        type="video/mp4"
                      />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : (
                  <div className="relative aspect-video w-full bg-[#050912]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getMediaUrl(selectedItem.filepath)}
                      alt={selectedItem.filename}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
              </div>

              {/* Filename & Type */}
              <div>
                <h3 className="text-sm font-bold break-all text-[#E8EDF5]">
                  {selectedItem.filename}
                </h3>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-[#1E3048] px-2 py-0.5 text-[9px] font-semibold tracking-wide text-[#60A5FA] uppercase">
                  {selectedItem.media_type === 'video' ? (
                    <VideoIcon className="h-2.5 w-2.5" />
                  ) : (
                    <ImageIcon className="h-2.5 w-2.5" />
                  )}
                  {selectedItem.media_type}
                </span>
              </div>

              {/* Meta Stats List */}
              <div className="space-y-3 rounded-lg border border-[#1E3048] bg-[#0A0F1E]/50 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#5A7A9A]">Created</span>
                  <span className="font-medium text-[#E8EDF5]">
                    {new Date(selectedItem.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5A7A9A]">File ID</span>
                  <span
                    className="max-w-[120px] truncate font-mono text-[10px] text-[#5A7A9A]"
                    title={selectedItem.id}
                  >
                    {selectedItem.id}
                  </span>
                </div>
              </div>

              {/* Redirection Analysis Panel */}
              <div className="space-y-3 border-t border-[#1E3048] pt-4">
                <Link
                  href="/investigations/new"
                  onClick={() => {
                    useInvestigationStore
                      .getState()
                      .setSelectedMedia(selectedItem);
                  }}
                  className="group flex items-center justify-between rounded-lg border border-[#1E3048] bg-[#0D1628] p-3.5 text-left transition-all hover:border-[#1565C0] hover:bg-[#1565C0]/5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-[#1565C0]/10 p-2 text-[#60A5FA]">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#E8EDF5]">
                        Start Investigation
                      </p>
                      <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
                        Analyze this file in investigations
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#5A7A9A] transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AWS S3 Style Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="animate-in fade-in zoom-in-95 w-full max-w-md space-y-4 rounded-2xl border border-[#1E3048] bg-[#0D1628] p-6 shadow-2xl duration-200">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-base font-bold text-[#E8EDF5]">
                Warning: Confirm Permanent Purge
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-[#5A7A9A]">
              This action will permanently delete all files in the gallery
              (mimicking an AWS S3 bucket purge process). This operation is
              irreversible.
            </p>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#E8EDF5]">
                To confirm deletion, please type the code below:
              </p>
              <div className="rounded-xl border border-[#1E3048] bg-[#0A0F1E] px-4 py-2.5 text-center font-mono text-base font-bold tracking-widest text-red-400 select-none">
                {randomCode}
              </div>
            </div>

            <input
              type="text"
              placeholder="Type confirmation code here"
              value={typedCode}
              onChange={(e) => setTypedCode(e.target.value)}
              className="w-full rounded-xl border border-[#1E3048] bg-[#0A0F1E] px-4 py-2.5 text-center font-mono text-sm text-[#E8EDF5] placeholder-[#5A7A9A] outline-none focus:border-red-500/50"
            />

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 rounded-xl border border-[#1E3048] bg-transparent py-2.5 text-sm font-semibold text-[#5A7A9A] transition-all hover:bg-[#1E3048] hover:text-[#E8EDF5]"
              >
                Cancel
              </button>
              <button
                disabled={typedCode !== randomCode}
                onClick={handleClearAllConfirm}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  Video,
  Image as ImageIcon,
  Trash2,
  Loader2,
  ArrowLeft,
  Plus,
  X,
  AlertTriangle,
  LayoutGrid,
  List,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  uploadGalleryMedia,
  listGalleryMedia,
  deleteGalleryMedia,
  deleteAllGalleryMedia,
  getGalleryMediaUrl,
} from '@/lib/api/gallery';
import { useLibraryPageStore } from '@/stores/libraryPageStore';
import { useUserStore } from '@/stores/userStore';
import type { GalleryMedia } from '@/types/gallery';

type FilterType = 'all' | 'video' | 'photo';
type LayoutType = 'grid' | 'list';

const gridColClasses: Record<number, string> = {
  2: 'grid grid-cols-1 sm:grid-cols-2 gap-5',
  3: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5',
  4: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5',
  5: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5',
  6: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5',
  7: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-5',
  8: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-5',
  9: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-5',
  10: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-10 gap-5',
};

export default function MyLibraryPage() {
  const {
    mediaList,
    loading,
    uploading,
    activeFilter,
    setActiveFilter,
    viewLayout,
    setViewLayout,
    previewItem,
    setPreviewItem,
    itemToDelete,
    setItemToDelete,
    deleteAllOpen,
    setDeleteAllOpen,
    deleteConfirmText,
    setDeleteConfirmText,
    fetchGallery,
    handleUpload,
    confirmDeleteSingle,
    confirmDeleteAll,
  } = useLibraryPageStore();

  const { currentGridCols, cycleGridCols } = useUserStore();

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const triggerFileInput = () => {
    document.getElementById('hidden-file-input')?.click();
  };

  const handleDeleteTrigger = (item: GalleryMedia, e: React.MouseEvent) => {
    e.stopPropagation();
    setItemToDelete(item);
  };

  // Filter media
  const filteredMedia = mediaList.filter((item) => {
    if (activeFilter === 'video') return item.media_type === 'video';
    if (activeFilter === 'photo') return item.media_type === 'photo';
    return true;
  });

  return (
    <div className="max-w-6xl space-y-6">
      {/* Hidden File Input for Google-Drive style upload */}
      <input
        id="hidden-file-input"
        type="file"
        multiple
        accept="video/*,image/*"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await handleUpload(Array.from(e.target.files));
            e.target.value = ''; // Reset input selection
          }
        }}
      />

      {/* Header Row */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/services/analysis"
              className="rounded-lg p-1 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-bold text-[#E8EDF5]">My Library</h1>
          </div>
          <p className="ml-7 text-xs text-[#5A7A9A]">
            Manage your raw images and video clips used across computer vision
            runs.
          </p>
        </div>

        {/* Action Buttons at Top Right */}
        <div className="flex items-center gap-2.5 self-end md:self-auto">
          {/* Delete All Button */}
          <button
            onClick={() => setDeleteAllOpen(true)}
            disabled={mediaList.length === 0 || uploading}
            className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3.5 py-2 text-xs font-semibold text-red-400 transition-all hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Delete All
          </button>

          {/* Upload Button */}
          <button
            onClick={triggerFileInput}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg bg-[#1565C0] px-4 py-2 text-xs font-semibold text-white shadow-md shadow-[#1565C0]/20 transition-all hover:bg-[#1976D2] disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {uploading ? 'Uploading...' : 'Upload Media'}
          </button>
        </div>
      </div>

      {/* Filter Tabs & Layout Toggle Row */}
      <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
        {/* Left: Filter Tabs */}
        <div className="flex items-center gap-1">
          {(['all', 'video', 'photo'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setActiveFilter(type)}
              className={cn(
                'relative px-4 py-1.5 text-xs font-semibold capitalize transition-all',
                activeFilter === type
                  ? 'text-[#60A5FA]'
                  : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
              )}
            >
              {type === 'all'
                ? 'All Assets'
                : type === 'video'
                  ? 'Videos'
                  : 'Photos'}
              {activeFilter === type && (
                <div className="absolute right-0 bottom-[-13px] left-0 h-0.5 bg-[#1565C0]" />
              )}
            </button>
          ))}
        </div>

        {/* Right: Layout Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
          <button
            onClick={() => {
              if (viewLayout !== 'grid') {
                setViewLayout('grid');
              } else {
                cycleGridCols();
              }
            }}
            className={cn(
              'flex items-center gap-1 rounded-md px-2 py-1.5 transition-colors',
              viewLayout === 'grid'
                ? 'bg-[#1E3048] text-[#60A5FA]'
                : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
            )}
            title={`Grid view (${currentGridCols} columns)`}
          >
            <span className="text-[10px] leading-none font-extrabold opacity-85 select-none">
              {currentGridCols}
            </span>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewLayout('list')}
            className={cn(
              'rounded-md p-1.5 transition-colors',
              viewLayout === 'list'
                ? 'bg-[#1E3048] text-[#60A5FA]'
                : 'text-[#5A7A9A] hover:text-[#E8EDF5]',
            )}
            title="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Catalog View */}
      {loading && mediaList.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-[#5A7A9A]">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading library
          files...
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1E3048] bg-[#0D1628]/40 py-12 text-center text-xs text-[#5A7A9A]">
          No{' '}
          {activeFilter === 'all'
            ? 'files'
            : activeFilter === 'video'
              ? 'videos'
              : 'photos'}{' '}
          found in your library.
        </div>
      ) : viewLayout === 'grid' ? (
        /* ── GRID VIEW ── */
        <div className={gridColClasses[currentGridCols] || gridColClasses[4]}>
          {filteredMedia.map((item) => {
            const isImage = item.media_type === 'photo';
            return (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className="group relative flex min-h-[220px] cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-[#1E3048] bg-[#0D1628] transition-all hover:border-[#1E3048]/80"
              >
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-[#1E3048] bg-black">
                  {isImage ? (
                    <img
                      src={getGalleryMediaUrl(item.filepath)}
                      alt={item.filename}
                      className="animate-fade-in h-full w-full object-cover"
                    />
                  ) : (
                    <div className="relative flex h-full w-full items-center justify-center">
                      <video
                        src={`${getGalleryMediaUrl(item.filepath)}#t=0.5`}
                        preload="metadata"
                        muted
                        playsInline
                        className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-100"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="h-6 w-6 text-white/80 drop-shadow" />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={(e) => handleDeleteTrigger(item, e)}
                    className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-[#5A7A9A] opacity-0 shadow transition-all group-hover:opacity-100 hover:bg-red-500/90 hover:text-white"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="min-w-0 p-3.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {isImage ? (
                      <ImageIcon className="h-3.5 w-3.5 shrink-0 text-[#60A5FA]" />
                    ) : (
                      <Video className="h-3.5 w-3.5 shrink-0 text-[#60A5FA]" />
                    )}
                    <span
                      className="truncate text-xs font-semibold text-[#E8EDF5]"
                      title={item.filename}
                    >
                      {item.filename}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-[#5A7A9A]">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="flex flex-col gap-2.5">
          {filteredMedia.map((item) => {
            const isImage = item.media_type === 'photo';
            return (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className="group flex min-h-[64px] cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-3 transition-all hover:border-[#1E3048]/80 hover:bg-[#1E3048]/10"
              >
                {/* Left: Thumbnail & Name info */}
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-[#1E3048]/55 bg-black">
                    {isImage ? (
                      <img
                        src={getGalleryMediaUrl(item.filepath)}
                        alt={item.filename}
                        className="animate-fade-in h-full w-full object-cover"
                      />
                    ) : (
                      <div className="relative flex h-full w-full items-center justify-center">
                        <video
                          src={`${getGalleryMediaUrl(item.filepath)}#t=0.5`}
                          preload="metadata"
                          className="h-full w-full object-cover opacity-80"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Video className="h-3.5 w-3.5 text-white/70" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <span
                      className="block max-w-sm truncate text-xs font-semibold text-[#E8EDF5] sm:max-w-md md:max-w-xl"
                      title={item.filename}
                    >
                      {item.filename}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[10px] text-[#5A7A9A]">
                      {isImage ? (
                        <>
                          <ImageIcon className="h-3 w-3" /> Photo Asset
                        </>
                      ) : (
                        <>
                          <Video className="h-3 w-3" /> Video Clip
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Right: Date & Actions */}
                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden text-[10px] text-[#5A7A9A] sm:inline">
                    Uploaded: {new Date(item.created_at).toLocaleDateString()}
                  </span>

                  <button
                    onClick={(e) => handleDeleteTrigger(item, e)}
                    className="rounded-lg p-1.5 text-[#5A7A9A] opacity-0 transition-colors group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                    title="Delete permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FULL SCREEN INTERACTIVE PREVIEW MODAL ── */}
      {previewItem && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative flex w-full max-w-4xl flex-col space-y-4 rounded-2xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Title Bar */}
            <div className="flex items-center justify-between border-b border-[#1E3048] pb-3">
              <div className="flex min-w-0 items-center gap-2">
                {previewItem.media_type === 'photo' ? (
                  <ImageIcon className="h-4.5 w-4.5 shrink-0 text-[#60A5FA]" />
                ) : (
                  <Video className="h-4.5 w-4.5 shrink-0 text-[#60A5FA]" />
                )}
                <h3
                  className="max-w-[80%] truncate text-sm font-semibold text-[#E8EDF5]"
                  title={previewItem.filename}
                >
                  {previewItem.filename}
                </h3>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="rounded-lg p-1.5 text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                title="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Media Body */}
            <div className="flex min-h-[300px] flex-1 items-center justify-center overflow-hidden rounded-lg bg-black">
              {previewItem.media_type === 'photo' ? (
                <img
                  src={getGalleryMediaUrl(previewItem.filepath)}
                  alt={previewItem.filename}
                  className="animate-fade-in max-h-[70vh] max-w-full rounded-lg object-contain shadow-inner"
                />
              ) : (
                <video
                  src={getGalleryMediaUrl(previewItem.filepath)}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-inner"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM SINGLE-FILE DELETE CONFIRMATION MODAL ── */}
      {itemToDelete && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setItemToDelete(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-[#0D1628] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />
            <div className="space-y-5 p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#E8EDF5]">
                    Delete Media File?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#5A7A9A]">
                    You are about to permanently delete{' '}
                    <span className="font-semibold text-[#E8EDF5]">
                      {itemToDelete.filename}
                    </span>{' '}
                    from your gallery library. This action{' '}
                    <span className="font-medium text-red-400">
                      cannot be undone
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-red-500/15 bg-red-500/5 px-4 py-3 text-xs text-red-300/80">
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  File will be permanently deleted from server storage
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-red-400" />
                  Any configuration linked to this file will be lost
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 rounded-xl border border-[#1E3048] px-4 py-2.5 text-sm font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteSingle}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM DELETE ALL CONFIRMATION MODAL WITH TYPE CHECK ── */}
      {deleteAllOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => {
            setDeleteAllOpen(false);
            setDeleteConfirmText('');
          }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-[#0D1628] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-1 w-full bg-gradient-to-r from-red-600 to-red-400" />
            <div className="space-y-5 p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#E8EDF5]">
                    Delete All Library Media?
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-[#5A7A9A]">
                    You are about to permanently delete{' '}
                    <span className="font-bold text-[#E8EDF5]">
                      ALL {mediaList.length} media assets
                    </span>{' '}
                    from your storage. This action{' '}
                    <span className="font-medium text-red-400">
                      cannot be undone
                    </span>
                    .
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-[#5A7A9A]">
                  To verify, type{' '}
                  <span className="font-bold text-[#E8EDF5]">
                    &quot;permanent delete&quot;
                  </span>{' '}
                  below:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type permanent delete"
                  className="w-full rounded-lg border border-[#1E3048] bg-[#0A0F1E] px-3.5 py-2 text-xs text-[#E8EDF5] placeholder-[#5A7A9A]/50 focus:border-[#1565C0] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setDeleteAllOpen(false);
                    setDeleteConfirmText('');
                  }}
                  className="flex-1 rounded-xl border border-[#1E3048] px-4 py-2.5 text-sm font-medium text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]"
                >
                  Cancel
                </button>
                <button
                  disabled={deleteConfirmText !== 'permanent delete'}
                  onClick={confirmDeleteAll}
                  className={cn(
                    'flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all',
                    deleteConfirmText === 'permanent delete'
                      ? 'bg-red-600 hover:bg-red-500'
                      : 'cursor-not-allowed bg-[#1E3048] text-[#5A7A9A] opacity-40',
                  )}
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

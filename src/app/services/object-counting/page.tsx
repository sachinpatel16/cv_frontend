'use client';

import { useEffect } from 'react';
import { ImageIcon, Settings2, CheckCircle2, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useObjectCountingStore } from '@/stores/objectCountingStore';
import type { ObjectCountMedia } from '@/types/objectcount';
import { LibraryTab } from './components/LibraryTab';
import { ConfigTab } from './components/ConfigTab';
import { ResultsTab } from './components/ResultsTab';

type Tab = 'library' | 'config' | 'results';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'library', label: 'Media Library', icon: ImageIcon },
  { id: 'config', label: 'Configuration', icon: Settings2 },
  { id: 'results', label: 'Results', icon: CheckCircle2 },
];

export default function ObjectCountingPage() {
  const {
    activeTab,
    setActiveTab,
    selectedMediaId,
    setSelectedMediaId,
    setDetails,
    fetchMedia,
    fetchDetails,
    media,
  } = useObjectCountingStore();

  // Initial media fetch
  useEffect(() => {
    fetchMedia(true);
  }, [fetchMedia]);

  // Fetch details when a media item is selected and tab switches away from library
  useEffect(() => {
    if (selectedMediaId && activeTab !== 'library') {
      fetchDetails(selectedMediaId);
    }
  }, [selectedMediaId, activeTab, fetchDetails]);

  // Poll media list while items are processing
  useEffect(() => {
    const hasProcessing = media.some(
      (m: ObjectCountMedia) =>
        m.status === 'processing' || m.status === 'pending',
    );
    if (!hasProcessing) return;
    const interval = setInterval(() => {
      fetchMedia(false);
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media]);

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            Generic Object Count & Tracking
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            YOLO + BoT-SORT background analysis dashboard for custom object
            tracking, concurrency reports, and demographic metrics.
          </p>
        </div>
        {activeTab !== 'library' && (
          <button
            onClick={() => {
              setActiveTab('library');
              setSelectedMediaId(null);
              setDetails(null);
            }}
            className="flex items-center gap-1.5 rounded-md border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-xs font-medium text-[#E8EDF5] transition-colors hover:bg-[#1E3048]"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Library
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1 rounded-lg border border-[#1E3048] bg-[#0A0F1E] p-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const disabled =
            (id === 'config' || id === 'results') && !selectedMediaId;
          return (
            <button
              key={id}
              onClick={() => {
                if (disabled) {
                  toast.error(
                    'Select a media item from the library first to configure or view tracking results.',
                  );
                  return;
                }
                setActiveTab(id);
              }}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                activeTab === id
                  ? 'bg-[#1565C0] text-white'
                  : 'text-[#5A7A9A] hover:bg-[#1E3048] hover:text-[#E8EDF5]',
                disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'library' && <LibraryTab />}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'results' && <ResultsTab />}
    </div>
  );
}

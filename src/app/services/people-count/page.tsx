'use client';

import { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { usePeopleCountStore } from '@/stores/peopleCountStore';

// Import modular components
import { LibraryView } from './components/LibraryView';
import { DetailsView } from './components/DetailsView';

export default function PeopleCountPage() {
  const { activeTab, fetchMedia, closeDetails } = usePeopleCountStore();

  useEffect(() => {
    fetchMedia(true);
  }, [fetchMedia]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#E8EDF5]">
            People Count & Video Tracking
          </h1>
          <p className="mt-1 text-sm text-[#5A7A9A]">
            YOLO + ByteTrack analytics dashboard for occupancy metrics and
            timeline tracking.
          </p>
        </div>
        {activeTab === 'details' && (
          <button
            onClick={closeDetails}
            className="flex items-center gap-1.5 rounded-md border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-xs font-medium text-[#E8EDF5] hover:bg-[#1E3048]"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Library
          </button>
        )}
      </div>
      {activeTab === 'library' && <LibraryView />}
      {activeTab === 'details' && <DetailsView />}
    </div>
  );
}

'use client';

import React from 'react';

interface AnalyticsCardsProps {
  totalUniqueTracked: number | null;
  peakConcurrency: number | null;
  avgConcurrency: number | null;
  videoDurationSeconds: number | null;
}

export default function AnalyticsCards({
  totalUniqueTracked,
  peakConcurrency,
  avgConcurrency,
  videoDurationSeconds,
}: AnalyticsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {/* Total unique objects */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center shadow-md">
        <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Total Unique Tracked
        </p>
        <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
          {totalUniqueTracked ?? '—'}
        </p>
      </div>

      {/* Peak concurrent objects */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center shadow-md">
        <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Peak Concurrency
        </p>
        <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
          {peakConcurrency ?? '—'}
        </p>
      </div>

      {/* Average concurrent objects */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center shadow-md">
        <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Average Concurrency
        </p>
        <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
          {avgConcurrency !== null ? avgConcurrency.toFixed(2) : '—'}
        </p>
      </div>

      {/* Video Duration */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4 text-center shadow-md">
        <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
          Footage Duration
        </p>
        <p className="mt-2 text-2xl font-bold text-[#E8EDF5]">
          {videoDurationSeconds !== null
            ? `${videoDurationSeconds.toFixed(2)}s`
            : '—'}
        </p>
      </div>
    </div>
  );
}

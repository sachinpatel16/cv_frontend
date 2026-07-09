'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface EntryExitSummaryProps {
  totalEntries: number;
  totalExits: number;
}

export default function EntryExitSummary({
  totalEntries,
  totalExits,
}: EntryExitSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-dashed border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4 shadow-sm md:grid-cols-2">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="h-5 w-5 rotate-90" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
              Total Entries (IN)
            </p>
            <p className="mt-0.5 text-xl font-bold text-[#E8EDF5]">
              {totalEntries}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-[#5A7A9A]">Across crossing gate</span>
      </div>

      <div className="flex items-center justify-between border-t border-[#1E3048]/60 p-2 md:border-t-0 md:border-l">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10 text-red-400">
            <Activity className="h-5 w-5 -rotate-90" />
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-[#5A7A9A] uppercase">
              Total Exits (OUT)
            </p>
            <p className="mt-0.5 text-xl font-bold text-[#E8EDF5]">
              {totalExits}
            </p>
          </div>
        </div>
        <span className="text-[10px] text-[#5A7A9A]">Across crossing gate</span>
      </div>
    </div>
  );
}

'use client';

import { DoorOpen, Lock } from 'lucide-react';
import { ZoneEditor } from '@/features/analyses/shared/ZoneEditor';
import type { InputComponentProps } from '@/features/analyses/types';

export default function EntryExitInput(_props: InputComponentProps) {
  return (
    <div className="space-y-6">
      {/* Coming soon banner */}
      <div className="flex items-start gap-4 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/10">
          <Lock className="h-5 w-5 text-[#F59E0B]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#E8EDF5]">
            Entry / Exit Counting — Coming Soon
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#5A7A9A]">
            This analysis will let you draw entry and exit zones on video
            keyframes to count people or vehicles crossing defined boundaries.
            The backend integration is currently in progress.
          </p>
        </div>
      </div>

      {/* Zone editor preview */}
      <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
        <div className="mb-4 flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-[#5A7A9A]" />
          <h3 className="text-sm font-semibold text-[#E8EDF5]">
            Zone Drawing Preview
          </h3>
        </div>
        <ZoneEditor readOnly />
      </div>

      {/* Disabled submit */}
      <button
        disabled
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#1565C0] text-sm font-medium text-white opacity-40"
      >
        <Lock className="h-4 w-4" />
        Run Entry/Exit Analysis
      </button>
    </div>
  );
}

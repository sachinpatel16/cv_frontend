'use client';

import { DoorOpen } from 'lucide-react';
import type { ResultComponentProps } from '@/features/analyses/types';

export default function EntryExitResult(_props: ResultComponentProps) {
  return (
    <div className="flex h-64 items-center justify-center rounded-xl border border-[#1E3048] bg-[#0D1628]">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E3048] bg-[#0A0F1E]">
          <DoorOpen className="h-6 w-6 text-[#5A7A9A]/40" />
        </div>
        <p className="text-sm font-medium text-[#E8EDF5]">
          Entry / Exit Results
        </p>
        <p className="mt-1 text-xs text-[#5A7A9A]">
          Results will appear here once the backend integration is complete.
        </p>
      </div>
    </div>
  );
}

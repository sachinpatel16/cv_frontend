'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DemographicsSummaryProps {
  classifyGender: boolean;
  genderBreakdown: Record<string, number> | null | undefined;
}

export default function DemographicsSummary({
  classifyGender,
  genderBreakdown,
}: DemographicsSummaryProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-md">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
            Demographics (insightface)
          </h3>
          <span
            className={cn(
              'rounded border px-1.5 py-0.5 text-[9px] font-bold',
              classifyGender
                ? 'border-emerald-500/15 bg-emerald-500/10 text-emerald-400'
                : 'border-rose-500/15 bg-rose-500/10 text-rose-400',
            )}
          >
            {classifyGender ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>
        <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
          Gender breakdowns identified from facial head crops of tracked people.
        </p>
      </div>

      {classifyGender && genderBreakdown ? (
        <div className="my-auto space-y-4 pt-4">
          {Object.entries(genderBreakdown).map(([gender, count]) => {
            const total =
              Object.values(genderBreakdown).reduce((a, b) => a + b, 0) || 1;
            const percent = Math.round((count / total) * 100);
            const colorMap: Record<string, string> = {
              male: 'bg-[#1565C0]',
              female: 'bg-pink-500',
              unknown: 'bg-gray-500',
            };
            return (
              <div key={gender} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#E8EDF5] capitalize">
                    {gender}
                  </span>
                  <span className="font-semibold text-[#5A7A9A]">
                    {count} ({percent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#0A0F1E]">
                  <div
                    className={cn('h-full', colorMap[gender] || 'bg-gray-500')}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center space-y-2 py-6 text-center">
          <Users className="h-8 w-8 text-[#1E3048]" />
          <p className="max-w-[200px] text-xs text-[#5A7A9A]">
            {classifyGender
              ? 'No human facial profiles were captured or resolved.'
              : 'InsightFace classification was not toggled in settings.'}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { Users, Car } from 'lucide-react';

interface CrossingCounts {
  entry: number;
  exit: number;
}

interface LineCrossingBreakdownProps {
  classBreakdown: Record<string, CrossingCounts>;
}

export default function LineCrossingBreakdown({
  classBreakdown,
}: LineCrossingBreakdownProps) {
  return (
    <div className="space-y-4 rounded-xl border border-[#1E3048] bg-[#0D1628] p-5 shadow-md">
      <div>
        <h3 className="text-xs font-semibold tracking-wider text-[#E8EDF5] uppercase">
          Line Crossing Class Breakdown
        </h3>
        <p className="mt-0.5 text-[10px] text-[#5A7A9A]">
          Detailed breakdown of entries and exits for each detected class
          category.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-[#E8EDF5]">
          <thead>
            <tr className="border-b border-[#1E3048] font-semibold text-[#5A7A9A]">
              <th className="py-2">Category</th>
              <th className="py-2 text-right">Entries (IN)</th>
              <th className="py-2 text-right">Exits (OUT)</th>
              <th className="py-2 text-right">Total Crossings</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3048]/60">
            {Object.entries(classBreakdown).map(([cname, counts]) => {
              const total = counts.entry + counts.exit;
              return (
                <tr
                  key={cname}
                  className="transition-colors hover:bg-[#1E3048]/25"
                >
                  <td className="flex items-center gap-1.5 py-2.5 font-medium capitalize">
                    {cname === 'person' ? (
                      <Users className="h-3.5 w-3.5 text-[#1565C0]" />
                    ) : (
                      <Car className="h-3.5 w-3.5 text-[#1565C0]" />
                    )}
                    {cname}
                  </td>
                  <td className="py-2.5 text-right font-bold text-emerald-400">
                    +{counts.entry}
                  </td>
                  <td className="py-2.5 text-right font-bold text-red-400">
                    -{counts.exit}
                  </td>
                  <td className="py-2.5 text-right text-[#5A7A9A]">{total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

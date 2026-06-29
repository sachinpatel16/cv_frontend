import React from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number | null;
  icon: React.ElementType;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'red';
}) {
  const palette = {
    blue: 'border-[#1565C0]/20 bg-[#1565C0]/5 text-[#60A5FA]',
    purple: 'border-purple-500/20 bg-purple-500/5 text-purple-400',
    green: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    amber: 'border-[#F59E0B]/20 bg-[#F59E0B]/5 text-[#F59E0B]',
  };
  return (
    <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-4">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg border p-2', palette[color])}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] text-[#5A7A9A]">{label}</p>
          <p className="text-lg font-bold text-[#E8EDF5]">{value ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

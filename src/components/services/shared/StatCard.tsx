import { cn } from '@/lib/utils';

type Color = 'blue' | 'green' | 'amber' | 'purple' | 'red';

const palette: Record<Color, string> = {
  blue: 'text-[#60A5FA] bg-[#1565C0]/10 border-[#1565C0]/20',
  green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  red: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'blue',
}: {
  label: string;
  value: string | number | null;
  icon: React.ElementType;
  color?: Color;
}) {
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

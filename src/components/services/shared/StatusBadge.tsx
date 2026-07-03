import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';

type SessionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; icon: React.ElementType }> = {
    completed: {
      color: 'text-emerald-400 bg-[#071912]/95 border-emerald-500/30',
      icon: CheckCircle2,
    },
    pending: {
      color: 'text-amber-400 bg-[#1e150a]/95 border-amber-500/30',
      icon: Clock,
    },
    processing: {
      color: 'text-[#60A5FA] bg-[#0c162d]/95 border-blue-500/30',
      icon: Loader2,
    },
    failed: {
      color: 'text-red-400 bg-[#1f0b0f]/95 border-red-500/30',
      icon: AlertCircle,
    },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold shadow-md backdrop-blur-sm transition-colors ${s.color}`}
    >
      <Icon
        className={cn(
          'h-3 w-3 shrink-0',
          status === 'processing' && 'animate-spin',
        )}
      />
      <span className="capitalize">{status}</span>
    </span>
  );
}

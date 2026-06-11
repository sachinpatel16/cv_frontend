import { cn } from '@/lib/utils';

type Status = 'pending' | 'processing' | 'completed' | 'failed';

const STATUS_MAP: Record<Status, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'text-[#5A7A9A] bg-[#5A7A9A]/10' },
  processing: { label: 'Processing', cls: 'text-[#F59E0B] bg-[#F59E0B]/10' },
  completed: { label: 'Completed', cls: 'text-emerald-400 bg-emerald-400/10' },
  failed: { label: 'Failed', cls: 'text-red-400 bg-red-400/10' },
};

export function StatusBadge({ status }: { status: Status }) {
  const { label, cls } = STATUS_MAP[status] ?? STATUS_MAP.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        cls,
      )}
    >
      {label}
    </span>
  );
}

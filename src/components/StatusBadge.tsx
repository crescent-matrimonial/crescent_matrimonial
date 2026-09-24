import type { Outcome } from '@/lib/types';

const styles: Record<Outcome | 'available' | 'active' | 'dismissed', string> = {
  pending: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  worked_out: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
  manually_removed: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
  available: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  active: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  dismissed: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
};

const labels: Record<Outcome | 'available' | 'active' | 'dismissed', string> = {
  pending: 'Pending',
  worked_out: 'Worked Out',
  failed: "Didn't Work Out",
  manually_removed: 'Manually Removed',
  available: 'Available',
  active: 'In Active Pair',
  dismissed: 'Dismissed',
};

export function StatusBadge({
  status,
  className = '',
}: {
  status: keyof typeof styles;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]} ${className}`}
    >
      {labels[status]}
    </span>
  );
}

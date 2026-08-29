import { useMemo, useState } from 'react';
import { History, TrendingUp, Heart, XCircle, Ban, CheckCircle2, Clock } from 'lucide-react';
import { useData } from '@/lib/data';
import { StatusBadge } from '@/components/StatusBadge';
import type { Outcome } from '@/lib/types';

type Filter = 'all' | 'worked_out' | 'failed' | 'manually_removed';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All Historical Matches' },
  { key: 'worked_out', label: 'Worked Out' },
  { key: 'failed', label: "Didn't Work Out" },
  { key: 'manually_removed', label: 'Manually Removed' },
];

function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

export function HistoryLogs() {
  const { people, matches } = useData();
  const [filter, setFilter] = useState<Filter>('all');

  const personById = (id: string) => people.find((p) => p.id === id);

  const metrics = useMemo(() => {
    const total = matches.length;
    const pending = matches.filter((m) => m.outcome === 'pending').length;
    const workedOut = matches.filter((m) => m.outcome === 'worked_out').length;
    const failed = matches.filter((m) => m.outcome === 'failed').length;
    const removed = matches.filter((m) => m.outcome === 'manually_removed').length;
    const completed = workedOut + failed + removed;
    const successRate = completed > 0 ? Math.round((workedOut / completed) * 100) : 0;
    return { total, pending, workedOut, failed, removed, successRate };
  }, [matches]);

  const filtered = useMemo(() => {
    const list = filter === 'all' ? matches : matches.filter((m) => m.outcome === filter);
    return [...list].sort(
      (a, b) => new Date(b.paired_at).getTime() - new Date(a.paired_at).getTime(),
    );
  }, [matches, filter]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">History & Match Logs</h2>
        <p className="text-sm text-slate-400">
          Comprehensive record of all pairings across every outcome.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Metric
          icon={<Heart className="h-4 w-4 text-white" />}
          label="Total Pairs"
          value={metrics.total}
          color="bg-sky-600"
        />
        <Metric
          icon={<Clock className="h-4 w-4 text-white" />}
          label="Active Pending"
          value={metrics.pending}
          color="bg-amber-600"
        />
        <Metric
          icon={<TrendingUp className="h-4 w-4 text-white" />}
          label="Success Rate"
          value={`${metrics.successRate}%`}
          color="bg-emerald-600"
        />
        <Metric
          icon={<CheckCircle2 className="h-4 w-4 text-white" />}
          label="Worked Out"
          value={metrics.workedOut}
          color="bg-emerald-600"
        />
        <Metric
          icon={<XCircle className="h-4 w-4 text-white" />}
          label="Failed"
          value={metrics.failed}
          color="bg-rose-600"
        />
        <Metric
          icon={<Ban className="h-4 w-4 text-white" />}
          label="Removed"
          value={metrics.removed}
          color="bg-slate-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
              filter === f.key
                ? 'bg-slate-700 text-slate-100 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
          <History className="mb-2 h-6 w-6 text-slate-600" />
          <p className="text-sm text-slate-500">No matches in this category.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3 text-left font-medium">Candidate Pair</th>
                <th className="px-4 py-3 text-left font-medium">Date Paired</th>
                <th className="px-4 py-3 text-center font-medium">Contact</th>
                <th className="px-4 py-3 text-left font-medium">Outcome</th>
                <th className="px-4 py-3 text-left font-medium">Outcome Date</th>
                <th className="px-4 py-3 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const p1 = personById(m.person_1_id);
                const p2 = personById(m.person_2_id);
                return (
                  <tr
                    key={m.id}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40"
                  >
                    <td className="px-4 py-3 text-slate-200">
                      {p1?.full_name ?? '—'} <span className="text-slate-500">&</span>{' '}
                      {p2?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(m.paired_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.exchanged_contact ? (
                        <CheckCircle2 className="mx-auto h-4 w-4 text-sky-400" />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={m.outcome as Outcome} />
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {m.outcome_set_at
                        ? new Date(m.outcome_set_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-400">
                      <span className="line-clamp-2">{m.notes || '—'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

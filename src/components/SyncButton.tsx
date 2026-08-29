import { useState } from 'react';
import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useData } from '@/lib/data';
import { ingestSheet, SHEETS } from '@/lib/sheets';

export function SyncButton() {
  const { upsertPeople, useMock } = useData();
  const [state, setState] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(0);

  const sync = async () => {
    setState('syncing');
    setMessage('');
    let total = 0;
    try {
      for (const sheet of SHEETS) {
        const people = await ingestSheet(sheet);
        total += people.length;
        if (people.length > 0) {
          if (useMock) {
            // In mock mode, simulate by mapping to mock-ish people with sheet_key
            const withIds = people.map((p) => ({ ...p, id: '' }));
            await upsertPeople(withIds);
          } else {
            await upsertPeople(people);
          }
        }
      }
      setCount(total);
      setState('done');
      setMessage(
        total > 0
          ? `Synced ${total} candidates from Google Sheets.`
          : 'No new rows found. Check that your sheets are published as CSV.',
      );
      setTimeout(() => setState('idle'), 4000);
    } catch (e) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Sync failed');
    }
  };

  return (
    <div className="flex items-center gap-3">
      {state === 'done' && (
        <span className="flex items-center gap-1.5 text-xs text-emerald-300">
          <Check className="h-3.5 w-3.5" /> {count} synced
        </span>
      )}
      {state === 'error' && (
        <span className="flex items-center gap-1.5 text-xs text-rose-300">
          <AlertCircle className="h-3.5 w-3.5" /> {message}
        </span>
      )}
      <button
        onClick={sync}
        disabled={state === 'syncing'}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500/50 hover:bg-slate-800 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${state === 'syncing' ? 'animate-spin' : ''}`} />
        {state === 'syncing' ? 'Syncing...' : 'Sync Data'}
      </button>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Heart, Mail, MailCheck, Archive, CheckCircle2, Phone } from 'lucide-react';
import { useData } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import type { Match, Outcome } from '@/lib/types';

function ArchiveModal({
  match,
  onClose,
  onArchive,
}: {
  match: Match | null;
  onClose: () => void;
  onArchive: (outcome: Exclude<Outcome, 'pending'>, notes: string) => void;
}) {
  const [outcome, setOutcome] = useState<Exclude<Outcome, 'pending'>>('failed');
  const [notes, setNotes] = useState('');

  if (!match) return null;

  const submit = () => {
    onArchive(outcome, notes);
    setNotes('');
    onClose();
  };

  return (
    <Modal open={!!match} onClose={onClose} title="Unpair & Archive" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Record the outcome and feedback for this pairing. Both candidates will return to
          Available status while the historic record is preserved.
        </p>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Outcome
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOutcome('failed')}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                outcome === 'failed'
                  ? 'border-rose-500 bg-rose-500/10 text-rose-300'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Didn't Work Out
            </button>
            <button
              onClick={() => setOutcome('manually_removed')}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                outcome === 'manually_removed'
                  ? 'border-slate-500 bg-slate-500/10 text-slate-300'
                  : 'border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Manually Removed
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Feedback / Reason
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Detail the reason for unpairing..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            Archive Pairing
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ActivePairings() {
  const { people, matches, updateMatch, archivePair } = useData();
  const [archiveTarget, setArchiveTarget] = useState<Match | null>(null);

  const active = useMemo(
    () => matches.filter((m) => m.outcome === 'pending'),
    [matches],
  );

  const personById = (id: string) => people.find((p) => p.id === id);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Active Pairings</h2>
        <p className="text-sm text-slate-400">
          {active.length} pair{active.length === 1 ? '' : 's'} currently in communication
          (pending outcome).
        </p>
      </div>

      {active.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
          <Heart className="mb-2 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            No active pairings. Initiate pairs from the Matchmaking Engine.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {active.map((m) => {
            const p1 = personById(m.person_1_id);
            const p2 = personById(m.person_2_id);
            if (!p1 || !p2) return null;
            return (
              <div
                key={m.id}
                className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar person={p1} size="md" />
                    <div className="text-center">
                      <Heart className="h-4 w-4 text-rose-400" />
                    </div>
                    <Avatar person={p2} size="md" />
                  </div>
                  <span className="text-xs text-slate-500">
                    Paired {new Date(m.paired_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-sm font-semibold text-slate-100">
                    {p1.full_name} & {p2.full_name}
                  </p>
                </div>

                <label className="mt-4 flex cursor-pointer items-center justify-between rounded-lg border border-slate-700/60 bg-slate-950/40 px-3 py-2.5">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    {m.exchanged_contact ? (
                      <MailCheck className="h-4 w-4 text-sky-400" />
                    ) : (
                      <Mail className="h-4 w-4 text-slate-500" />
                    )}
                    Contact exchanged
                  </span>
                  <input
                    type="checkbox"
                    checked={m.exchanged_contact}
                    onChange={(e) =>
                      updateMatch(m.id, { exchanged_contact: e.target.checked })
                    }
                    className="h-4 w-4 accent-sky-500"
                  />
                </label>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      updateMatch(m.id, {
                        outcome: 'worked_out',
                        outcome_set_at: new Date().toISOString(),
                      })
                    }
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Worked Out
                  </button>
                  <button
                    onClick={() => setArchiveTarget(m)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
                  >
                    <Archive className="h-4 w-4" /> Unpair & Archive
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ArchiveModal
        match={archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onArchive={(outcome, notes) =>
          archiveTarget && archivePair(archiveTarget.id, outcome, notes)
        }
      />
    </div>
  );
}

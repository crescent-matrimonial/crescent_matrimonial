import { useMemo, useState } from 'react';
import {
  Heart,
  Mail,
  MailCheck,
  XCircle,
  CheckCircle2,
  Phone,
  Search,
  Unplug,
  MessageSquare,
  ArrowRightLeft,
} from 'lucide-react';
import { useData } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { PairDetailsModal } from '@/components/PairDetailsModal';
import type { Match, PersonWithDetails } from '@/lib/types';

type ContactFilter = 'all' | 'exchanged' | 'none';

function ArchiveModal({
  match,
  personAName,
  personBName,
  onClose,
  onArchive,
}: {
  match: Match | null;
  personAName: string;
  personBName: string;
  onClose: () => void;
  onArchive: (notes: string) => void;
}) {
  const [notes, setNotes] = useState('');

  if (!match) return null;

  const submit = () => {
    onArchive(notes);
    setNotes('');
    onClose();
  };

  return (
    <Modal open={!!match} onClose={onClose} title="Didn't Work Out" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Mark <span className="font-semibold text-slate-100">{personAName}</span> &{' '}
          <span className="font-semibold text-slate-100">{personBName}</span> as "didn't work
          out." Both candidates will return to the pool, and this pairing will be recorded in
          history with your note.
        </p>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
            Feedback / Reason
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Detail the reason it didn't work out..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-rose-500"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            <XCircle className="h-4 w-4" /> Mark as Didn't Work Out
          </button>
        </div>
      </div>
    </Modal>
  );
}

function UnpairModal({
  match,
  personAName,
  personBName,
  onClose,
  onUnpair,
}: {
  match: Match | null;
  personAName: string;
  personBName: string;
  onClose: () => void;
  onUnpair: () => void;
}) {
  if (!match) return null;

  return (
    <Modal open={!!match} onClose={onClose} title="Unpair?" maxWidth="max-w-md">
      <div className="space-y-4">
        <p className="text-sm text-slate-300">
          Silently unpair <span className="font-semibold text-slate-100">{personAName}</span> &{' '}
          <span className="font-semibold text-slate-100">{personBName}</span>? Both candidates
          will return to the pool and can match with each other again. No record of this pairing
          will be kept in history.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onUnpair();
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
          >
            <Unplug className="h-4 w-4" /> Yes, Unpair
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function ActivePairings() {
  const { people, matches, updateMatch, archivePair, deleteMatch } = useData();
  const [archiveTarget, setArchiveTarget] = useState<Match | null>(null);
  const [unpairTarget, setUnpairTarget] = useState<Match | null>(null);
  const [detailTarget, setDetailTarget] = useState<Match | null>(null);
  const [query, setQuery] = useState('');
  const [contactFilter, setContactFilter] = useState<ContactFilter>('all');

  const active = useMemo(
    () => matches.filter((m) => m.outcome === 'pending'),
    [matches],
  );

  const personById = (id: string) => people.find((p) => p.id === id);

  const filtered = useMemo(() => {
    return active.filter((m) => {
      const p1 = personById(m.person_1_id);
      const p2 = personById(m.person_2_id);
      if (!p1 || !p2) return false;

      if (contactFilter === 'exchanged' && !m.exchanged_contact) return false;
      if (contactFilter === 'none' && m.exchanged_contact) return false;

      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        p1.full_name?.toLowerCase().includes(q) ||
        p2.full_name?.toLowerCase().includes(q)
      );
    });
  }, [active, people, query, contactFilter]);

  const contactCounts = useMemo(() => {
    let exchanged = 0;
    let none = 0;
    for (const m of active) {
      if (m.exchanged_contact) exchanged++;
      else none++;
    }
    return { exchanged, none, all: active.length };
  }, [active]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Active Pairings</h2>
        <p className="text-sm text-slate-400">
          {active.length} pair{active.length === 1 ? '' : 's'} currently in communication
          (pending outcome).
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name..."
            className="w-56 rounded-lg border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
          />
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
          {([
            { key: 'all' as const, label: `All (${contactCounts.all})` },
            { key: 'exchanged' as const, label: `Exchanged (${contactCounts.exchanged})` },
            { key: 'none' as const, label: `Not Exchanged (${contactCounts.none})` },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setContactFilter(f.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                contactFilter === f.key
                  ? 'bg-slate-700 text-slate-100 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {active.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
          <Heart className="mb-2 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            No active pairings. Initiate pairs from the Matchmaking Engine.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
          <p className="text-sm text-slate-500">No pairings match your filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((m) => {
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
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      Paired {new Date(m.paired_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => setUnpairTarget(m)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
                      title="Silently unpair without recording in history"
                    >
                      <Unplug className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-sm font-semibold text-slate-100">
                    {p1.full_name} & {p2.full_name}
                  </p>
                </div>

                {/* View details button */}
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={() => setDetailTarget(m)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> View Details
                  </button>
                </div>

                {/* Tags row */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  {m.exchanged_contact && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-1 text-xs font-medium text-sky-300 ring-1 ring-sky-500/30">
                      <MailCheck className="h-3 w-3" /> Contact Exchanged
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      updateMatch(m.id, {
                        exchanged_contact: !m.exchanged_contact,
                      })
                    }
                    className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      m.exchanged_contact
                        ? 'border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20'
                        : 'border border-slate-700 text-slate-400 hover:border-sky-500/40 hover:text-sky-300'
                    }`}
                  >
                    {m.exchanged_contact ? (
                      <>
                        <MailCheck className="h-4 w-4" /> Unmark Contact as Exchanged
                      </>
                    ) : (
                      <>
                        <Phone className="h-4 w-4" /> Mark Contact Exchanged
                      </>
                    )}
                  </button>
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
                    <XCircle className="h-4 w-4" /> Didn't Work Out
                  </button>

                </div>
              </div>
            );
          })}
        </div>
      )}

      <PairDetailsModal
        personA={detailTarget ? personById(detailTarget.person_1_id) ?? null : null}
        personB={detailTarget ? personById(detailTarget.person_2_id) ?? null : null}
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
      />

      <ArchiveModal
        match={archiveTarget}
        personAName={
          archiveTarget ? personById(archiveTarget.person_1_id)?.full_name ?? '' : ''
        }
        personBName={
          archiveTarget ? personById(archiveTarget.person_2_id)?.full_name ?? '' : ''
        }
        onClose={() => setArchiveTarget(null)}
        onArchive={(notes) =>
          archiveTarget && archivePair(archiveTarget.id, 'failed', notes)
        }
      />

      <UnpairModal
        match={unpairTarget}
        personAName={
          unpairTarget ? personById(unpairTarget.person_1_id)?.full_name ?? '' : ''
        }
        personBName={
          unpairTarget ? personById(unpairTarget.person_2_id)?.full_name ?? '' : ''
        }
        onClose={() => setUnpairTarget(null)}
        onUnpair={() => unpairTarget && deleteMatch(unpairTarget.id)}
      />
    </div>
  );
}

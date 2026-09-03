import { useMemo, useState } from 'react';
import { MoreVertical, Eye, Trash2, Users, UserCircle, Search, Database, Heart, RotateCcw, Trash, XCircle } from 'lucide-react';
import { useData } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { ProfileModal } from '@/components/ProfileModal';
import { Modal } from '@/components/Modal';
import { countPotentialMatches, hasWorkedOut } from '@/lib/matching';
import { HeartHandshake } from 'lucide-react';
import type { Match, PersonWithDetails, QuestionField } from '@/lib/types';

type GenderTab = 'male' | 'female';

function getStateOfResidence(person: PersonWithDetails): string | null {
  const dict = person.about_you;
  const field = Object.values(dict).find((f) => /state.*reside|state.*live/i.test(f.question.toLowerCase()));
  if (field && field.answer.trim()) return field.answer.trim();
  return null;
}

function deriveStatus(person: PersonWithDetails, matches: Match[]) {
  const personMatches = matches.filter(
    (m) => (m.person_1_id === person.id || m.person_2_id === person.id),
  );
  const active = personMatches.find((m) => m.outcome === 'pending');
  const priorPairs = personMatches.filter((m) => m.outcome !== 'pending').length;
  if (active) return { kind: 'active' as const, priorPairs };
  if (personMatches.length > 0)
    return { kind: 'available' as const, priorPairs };
  return { kind: 'available' as const, priorPairs: 0 };
}

function CandidateCard({
  person,
  matches,
  potentialCount,
  failedCount,
  onOpen,
  onGoToEngine,
}: {
  person: PersonWithDetails;
  matches: Match[];
  potentialCount: number;
  failedCount: number;
  onOpen: () => void;
  onGoToEngine: (personId: string, gender: 'male' | 'female') => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const status = deriveStatus(person, matches);

  return (
    <div className="group relative rounded-xl border border-slate-700/60 bg-slate-900/60 p-4 transition hover:border-slate-600">
      <div className="flex items-start gap-3">
        <Avatar person={person} size="lg" />
        <div className="min-w-0 flex-1">
          <h3
            className="cursor-pointer truncate font-semibold text-slate-100 hover:text-sky-300"
            onClick={onOpen}
          >
            {person.full_name}
          </h3>
          <p className="truncate text-xs text-slate-400">{person.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {person.age != null && <span>{person.age} yrs</span>}
            {getStateOfResidence(person) && (
              <span className="flex items-center gap-x-1.5">
                {person.age != null && <span className="text-slate-700">•</span>}
                {getStateOfResidence(person)}
              </span>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpen();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  <Eye className="h-4 w-4" /> View Profile
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setRemoveTarget(person);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/10"
                >
                  <Trash2 className="h-4 w-4" /> Remove Candidate
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={status.kind} />
        {status.priorPairs > 0 && (
          <button
            onClick={() => onGoToEngine(person.id, person.gender)}
            className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
            title="View in Matchmaking"
          >
            <Heart className="h-3 w-3" /> {status.priorPairs} prior {status.priorPairs === 1 ? 'pair' : 'pairs'}
          </button>
        )}
        {failedCount > 0 && (
          <button
            onClick={() => onGoToEngine(person.id, person.gender)}
            className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-300 ring-1 ring-rose-500/20 transition hover:bg-rose-500/20"
            title="View in Matchmaking"
          >
            <XCircle className="h-3 w-3" /> {failedCount} didn't work out
          </button>
        )}
        <button
          onClick={() => onGoToEngine(person.id, person.gender)}
          className="ml-auto inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-500/30 transition hover:bg-sky-500/25"
          title="View in Matchmaking"
        >
          <Users className="h-3 w-3" /> {potentialCount} potential
        </button>
      </div>
    </div>
  );
}

export function CandidatesDirectory({ onGoToEngine }: { onGoToEngine: (personId: string, gender: 'male' | 'female') => void }) {
  const { people, matches, dismissedPairs, useMock, seedSampleData, softDeletePerson, restorePerson } = useData();
  const [tab, setTab] = useState<GenderTab>('male');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PersonWithDetails | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [showWorkedOut, setShowWorkedOut] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<PersonWithDetails | null>(null);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedError(null);
    try {
      await seedSampleData();
    } catch (e) {
      setSeedError(e instanceof Error ? e.message : 'Failed to load sample data');
    } finally {
      setSeeding(false);
    }
  };

  const active = useMemo(
    () => people.filter((p) => !p.is_deleted && !hasWorkedOut(p.id, matches)),
    [people, matches],
  );
  const removed = useMemo(
    () => people.filter((p) => p.is_deleted && p.gender === tab),
    [people, tab],
  );
  const workedOut = useMemo(
    () => people.filter((p) => !p.is_deleted && p.gender === tab && hasWorkedOut(p.id, matches)),
    [people, tab, matches],
  );

  const filtered = useMemo(() => {
    return active
      .filter((p) => p.gender === tab)
      .filter((p) => {
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return (
          p.full_name?.toLowerCase().includes(q) ||
          p.email?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.occupation?.toLowerCase().includes(q)
        );
      });
  }, [active, tab, query]);

  const counts = useMemo(
    () => ({
      male: active.filter((p) => p.gender === 'male').length,
      female: active.filter((p) => p.gender === 'female').length,
    }),
    [active],
  );

  const potentialFor = (p: PersonWithDetails) =>
    countPotentialMatches(p, active, matches, dismissedPairs);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Candidates Directory</h2>
          <p className="text-sm text-slate-400">
            All active candidates synced from Google Sheets.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, city..."
            className="w-64 rounded-lg border border-slate-700 bg-slate-900/60 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none transition focus:border-sky-500"
          />
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
        {(['male', 'female'] as GenderTab[]).map((g) => (
          <button
            key={g}
            onClick={() => setTab(g)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === g
                ? g === 'male'
                  ? 'bg-sky-600 text-white shadow'
                  : 'bg-rose-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCircle className="h-4 w-4" />
            {g === 'male' ? 'Brothers' : 'Sisters'}
            <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs">
              {counts[g]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setShowWorkedOut((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            showWorkedOut
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
        >
          <HeartHandshake className="h-3.5 w-3.5" />
          {showWorkedOut ? 'Hide Worked Out' : `Worked Out (${workedOut.length})`}
        </button>
        <button
          onClick={() => setShowRemoved((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            showRemoved
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
          }`}
        >
          <Trash className="h-3.5 w-3.5" />
          {showRemoved ? 'Hide Removed' : `Removed (${removed.length})`}
        </button>
      </div>

      {showWorkedOut && (
        workedOut.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
            <p className="text-sm text-slate-500">No {tab === 'male' ? 'brothers' : 'sisters'} have worked out yet.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {workedOut.map((p) => {
              const state = getStateOfResidence(p);
              const partnerMatch = matches.find(
                (m) => m.outcome === 'worked_out' && (m.person_1_id === p.id || m.person_2_id === p.id),
              );
              const partnerId = partnerMatch
                ? (partnerMatch.person_1_id === p.id ? partnerMatch.person_2_id : partnerMatch.person_1_id)
                : null;
              const partner = partnerId ? people.find((x) => x.id === partnerId) : null;
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3"
                >
                  <Avatar person={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-300">{p.full_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.age && `${p.age} • `}{state ?? '—'}
                    </p>
                    {partner && (
                      <p className="truncate text-xs text-emerald-400">
                        Paired with {partner.full_name}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
                    <HeartHandshake className="h-3 w-3" /> Worked Out
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}

      {showRemoved && (
        removed.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
            <p className="text-sm text-slate-500">No removed candidates.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {removed.map((p) => {
              const state = getStateOfResidence(p);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3"
                >
                  <Avatar person={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-300">{p.full_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.age && `${p.age} • `}{state ?? '—'}
                    </p>
                  </div>
                  <button
                    onClick={() => restorePerson(p.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2 py-1 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/10"
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {active.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center">
          <Database className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">Your database is empty.</p>
          <p className="mt-1 text-xs text-slate-500">
            Sync candidates from Google Sheets with the Sync Data button, or load sample
            candidates to explore the dashboard.
          </p>
          {seedError && (
            <p className="mx-auto mt-3 max-w-sm rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              {seedError}
            </p>
          )}
          {!useMock && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:opacity-60"
            >
              <Database className="h-4 w-4" />
              {seeding ? 'Loading...' : 'Load Sample Data'}
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 py-16 text-center text-sm text-slate-500">
          No {tab === 'male' ? 'brothers' : 'sisters'} candidates found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <CandidateCard
              key={p.id}
              person={p}
              matches={matches}
              potentialCount={potentialFor(p)}
              failedCount={matches.filter((m) => m.outcome === 'failed' && (m.person_1_id === p.id || m.person_2_id === p.id)).length}
              onOpen={() => setSelected(p)}
              onGoToEngine={onGoToEngine}
            />
          ))}
        </div>
      )}

      <ProfileModal
        person={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Candidate?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Remove {removeTarget?.full_name} from the candidate pool? They will no longer
            appear in matchmaking, but you can restore them later from the Removed list.
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRemoveTarget(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (removeTarget) softDeletePerson(removeTarget.id);
                setRemoveTarget(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              <Trash2 className="h-4 w-4" /> Remove Candidate
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

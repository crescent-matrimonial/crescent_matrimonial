import { useMemo, useState } from 'react';
import { MoreVertical, Eye, Pencil, Trash2, Users, UserCircle, Search, Database } from 'lucide-react';
import { useData } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { StatusBadge } from '@/components/StatusBadge';
import { ProfileModal } from '@/components/ProfileModal';
import { countPotentialMatches } from '@/lib/matching';
import type { Match, Person } from '@/lib/types';

type GenderTab = 'male' | 'female';

function deriveStatus(person: Person, matches: Match[]) {
  const personMatches = matches.filter(
    (m) => (m.person_1_id === person.id || m.person_2_id === person.id),
  );
  const active = personMatches.find((m) => m.outcome === 'pending');
  if (active) return { kind: 'active' as const, pastCount: personMatches.length - 1 };
  if (personMatches.length > 0)
    return { kind: 'available' as const, pastCount: personMatches.length };
  return { kind: 'available' as const, pastCount: 0 };
}

function CandidateCard({
  person,
  matches,
  potentialCount,
  onOpen,
}: {
  person: Person;
  matches: Match[];
  potentialCount: number;
  onOpen: () => void;
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
            {person.full_name ?? 'Unnamed'}
          </h3>
          <p className="truncate text-xs text-slate-400">{person.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
            {person.age && <span>{person.age} yrs</span>}
            {person.location && <span>{person.location}</span>}
            {person.occupation && <span className="truncate">{person.occupation}</span>}
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
                    onOpen();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
                >
                  <Pencil className="h-4 w-4" /> Edit Details
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onOpen();
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
        {status.pastCount > 0 && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
            History ({status.pastCount})
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-300 ring-1 ring-sky-500/30">
          <Users className="h-3 w-3" /> {potentialCount} potential
        </span>
      </div>
    </div>
  );
}

export function CandidatesDirectory() {
  const { people, matches, dismissedPairs, useMock, seedSampleData } = useData();
  const [tab, setTab] = useState<GenderTab>('male');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Person | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);

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

  const active = useMemo(() => people.filter((p) => !p.is_deleted), [people]);

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

  const potentialFor = (p: Person) =>
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
            {g === 'male' ? 'Men' : 'Women'}
            <span className="rounded-md bg-black/20 px-1.5 py-0.5 text-xs">
              {counts[g]}
            </span>
          </button>
        ))}
      </div>

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
          No {tab === 'male' ? 'men' : 'women'} candidates found.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <CandidateCard
              key={p.id}
              person={p}
              matches={matches}
              potentialCount={potentialFor(p)}
              onOpen={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      <ProfileModal
        person={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

import { useMemo, useState, useEffect } from 'react';
import { Heart, X, ArrowRightLeft, Sparkles, ChevronDown, ChevronUp, Star, Users, RotateCcw, StickyNote, ExternalLink, HeartHandshake, Unplug, XCircle } from 'lucide-react';
import type { Match } from '@/lib/types';
import { useData } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { PhotoCarousel } from '@/components/PhotoCarousel';
import { findPotentialMatches, countPotentialMatches, countPotentialMatchesAlreadyPaired, sharedHobbies, hasPreferredEthnicity, hasWorkedOut } from '@/lib/matching';
import type { CompatibilityResult, PersonWithDetails, QuestionField } from '@/lib/types';

// --- Field extraction helpers ---

function getFieldFromSection(person: PersonWithDetails, section: 'about' | 'looking', pattern: RegExp): QuestionField | undefined {
  const dict = section === 'about' ? person.about_you : person.looking_for;
  return Object.values(dict).find((f) => pattern.test(f.question.toLowerCase()));
}

function getActualAge(person: PersonWithDetails): number | null {
  if (person.age != null) return person.age;
  const birthField = getFieldFromSection(person, 'about', /birth\s*date|date\s*of\s*birth|dob/i);
  if (birthField) {
    const parsed = new Date(birthField.answer.trim());
    if (!isNaN(parsed.getTime())) {
      const diff = Date.now() - parsed.getTime();
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  return null;
}

function getCountryOfEthnicity(person: PersonWithDetails): string {
  const field = getFieldFromSection(person, 'about', /country.*ethnicity/i);
  if (field && field.answer.trim()) return field.answer.trim();
  return '—';
}

// --- All responses side-by-side (collapsible) ---

function renderFieldValue(f: QuestionField | undefined) {
  if (!f) return <span className="text-slate-600">—</span>;
  if (f.multi && f.values.length > 1) {
    return (
      <ul className="list-disc pl-4 space-y-0.5">
        {f.values.map((v) => <li key={v}>{v}</li>)}
      </ul>
    );
  }
  return <span>{f.answer || '—'}</span>;
}

function AllResponsesSection({
  candidate,
  match,
}: {
  candidate: PersonWithDetails;
  match: PersonWithDetails;
}) {
  const [open, setOpen] = useState(false);

  const normalizeQ = (q: string) =>
    q.toLowerCase()
      .replace(/partner'?s?\s*/i, '')
      .replace(/looking\s*for/i, '')
      .replace(/preference/i, '')
      .trim();

  type Row = {
    question: string;
    section: 'about' | 'looking';
    candidateField: QuestionField | undefined;
    matchField: QuestionField | undefined;
  };

  const rows: Row[] = (() => {
    const candAbout = Object.values(candidate.about_you);
    const candLooking = Object.values(candidate.looking_for);
    const matchAbout = Object.values(match.about_you);
    const matchLooking = Object.values(match.looking_for);

    const seen = new Map<string, Row>();

    const addRow = (field: QuestionField, section: 'about' | 'looking', isCandidate: boolean) => {
      const key = normalizeQ(field.question);
      const existing = seen.get(key);
      if (existing) {
        if (isCandidate) existing.candidateField = field;
        else existing.matchField = field;
      } else {
        seen.set(key, {
          question: field.question,
          section,
          candidateField: isCandidate ? field : undefined,
          matchField: isCandidate ? undefined : field,
        });
      }
    };

    for (const f of candAbout) addRow(f, 'about', true);
    for (const f of matchAbout) addRow(f, 'about', false);
    for (const f of candLooking) addRow(f, 'looking', true);
    for (const f of matchLooking) addRow(f, 'looking', false);

    return Array.from(seen.values());
  })();

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-left transition hover:bg-slate-800/40"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          All Responses Side by Side
        </span>
        <span className="flex items-center gap-1 text-xs text-sky-400">
          {open ? (
            <>Hide <ChevronUp className="h-4 w-4" /></>
          ) : (
            <>Show <ChevronDown className="h-4 w-4" /></>
          )}
        </span>
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 text-left font-medium w-1/3">Question</th>
                <th className="px-3 py-2 text-left font-medium w-1/3">{candidate.full_name}</th>
                <th className="px-3 py-2 text-left font-medium w-1/3">{match.full_name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                return (
                  <tr
                    key={idx}
                    className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40"
                  >
                    <td className="px-3 py-2 text-xs text-slate-400">{row.question}</td>
                    <td className="px-3 py-2 text-slate-200">{renderFieldValue(row.candidateField)}</td>
                    <td className="px-3 py-2 text-slate-200">{renderFieldValue(row.matchField)}</td>
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

function AdminNote({ name, note }: { name: string; note: string | null }) {
  if (!note) return null;
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
        <StickyNote className="h-3.5 w-3.5" /> Note from {name}
      </p>
      <p className="mt-1 text-sm text-slate-300">{note}</p>
    </div>
  );
}

function PersonHeader({ person, onPhotoClick }: { person: PersonWithDetails; onPhotoClick: () => void }) {
  const age = getActualAge(person);
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <button
        onClick={onPhotoClick}
        className="shrink-0 cursor-pointer rounded-full transition hover:ring-4 hover:ring-sky-500/20"
        title="Click to view photos"
      >
        <Avatar person={person} size="xl" />
      </button>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{person.full_name}</h3>
        {age != null && <p className="text-xs text-slate-500">{age} yrs old</p>}
      </div>
    </div>
  );
}

function MatchCard({
  result,
  rank,
  candidate,
  matchActive,
  initiateDisabled,
  onInitiate,
  onDismiss,
  onView,
}: {
  result: CompatibilityResult;
  rank: number;
  candidate: PersonWithDetails;
  matchActive: boolean;
  initiateDisabled: boolean;
  onInitiate: () => void;
  onDismiss: () => void;
  onView: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const match = result.personA.id === candidate.id ? result.personB : result.personA;
  const hobbies = sharedHobbies(result.personA, result.personB);
  const preferTier = hasPreferredEthnicity(result.personA, result.personB);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="flex items-center gap-3">
        <Avatar person={match} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-100">{match.full_name}</h3>
          <p className="truncate text-xs text-slate-500">
            {match.age && `${match.age} • `}
            {match.location}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
          #{rank + 1}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {matchActive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300 ring-1 ring-emerald-500/30" title="Already in an active pair">
            <HeartHandshake className="h-3 w-3" /> In Active Pair
          </span>
        )}
        {preferTier && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-amber-300 ring-1 ring-amber-500/30">
            <Star className="h-3 w-3" /> Preferred Ethnicity
          </span>
        )}
        {hobbies.length > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-sky-300 ring-1 ring-sky-500/30">
            <Users className="h-3 w-3" /> {hobbies.length} shared {hobbies.length === 1 ? 'hobby' : 'hobbies'}
          </span>
        )}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
        >
          {expanded ? (
            <>Hide details <ChevronUp className="h-3.5 w-3.5" /></>
          ) : (
            <>View details <ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          {hobbies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-950/40 px-3 py-2">
              <span className="text-xs text-slate-500">Shared hobbies:</span>
              {hobbies.map((h) => (
                <span key={h} className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
                  {h}
                </span>
              ))}
            </div>
          )}
          <AdminNote name={candidate.full_name} note={candidate.admin_note} />
          <AdminNote name={match.full_name} note={match.admin_note} />
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          onClick={onDismiss}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" /> Dismiss
        </button>
        <button
          onClick={onView}
          className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" /> Details
        </button>
        <button
          onClick={onInitiate}
          disabled={initiateDisabled}
          title={initiateDisabled ? 'Already in an active pair' : undefined}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
            initiateDisabled
              ? 'cursor-not-allowed bg-slate-700 text-slate-400'
              : 'bg-emerald-600 hover:bg-emerald-500'
          }`}
        >
          <Heart className="h-3.5 w-3.5" /> Initiate Pair
        </button>
      </div>
    </div>
  );
}

type PickerGender = 'male' | 'female';

/** True if the person is currently in a match whose outcome is still pending. */
function isInActivePair(personId: string, matches: Match[]): boolean {
  return matches.some(
    (m) =>
      m.outcome === 'pending' &&
      (m.person_1_id === personId || m.person_2_id === personId),
  );
}

interface EngineInitial {
  personId: string;
  gender: 'male' | 'female';
}

export function MatchmakingEngine({ initial, onClearInitial }: { initial: EngineInitial | null; onClearInitial: () => void }) {
  const { people, matches, dismissedPairs, initiatePair, dismissPotentialMatch, undismissPair, deleteMatch } = useData();
  const [pickerGender, setPickerGender] = useState<PickerGender>('male');
  const [selectedPerson, setSelectedPerson] = useState<PersonWithDetails | null>(null);

  useEffect(() => {
    if (!initial) return;
    setPickerGender(initial.gender);
    const person = people.find((p) => p.id === initial.personId);
    if (person) setSelectedPerson(person);
    onClearInitial();
  }, [initial, people, onClearInitial]);
  const [detailResult, setDetailResult] = useState<CompatibilityResult | null>(null);
  const [dismissConfirm, setDismissConfirm] = useState<{ aId: string; bId: string } | null>(null);
  const [dismissNote, setDismissNote] = useState('');
  const [photoView, setPhotoView] = useState<{ photos: string[]; name: string } | null>(null);
  const [unpairTarget, setUnpairTarget] = useState<Match | null>(null);
  const [restoreFailedTarget, setRestoreFailedTarget] = useState<Match | null>(null);

  const active = useMemo(
    () => people.filter((p) => !p.is_deleted && !hasWorkedOut(p.id, matches)),
    [people, matches],
  );

  const candidates = useMemo(
    () =>
      active
        .filter((p) => p.gender === pickerGender)
        .sort((a, b) => {
          const aActive = isInActivePair(a.id, matches);
          const bActive = isInActivePair(b.id, matches);
          if (aActive === bActive) return 0;
          return aActive ? 1 : -1;
        }),
    [active, pickerGender, matches],
  );

  const results = useMemo(() => {
    if (!selectedPerson) return [];
    const raw = findPotentialMatches(selectedPerson, active, matches, dismissedPairs);
    const available = raw.filter((r) => {
      const other = r.personA.id === selectedPerson.id ? r.personB : r.personA;
      return !isInActivePair(other.id, matches);
    });
    return available.sort((a, b) => {
      const aPrefer = hasPreferredEthnicity(a.personA, a.personB) ? 1 : 0;
      const bPrefer = hasPreferredEthnicity(b.personA, b.personB) ? 1 : 0;
      if (aPrefer !== bPrefer) return bPrefer - aPrefer;
      const aHobbies = sharedHobbies(a.personA, a.personB).length;
      const bHobbies = sharedHobbies(b.personA, b.personB).length;
      return bHobbies - aHobbies;
    });
  }, [selectedPerson, active, matches, dismissedPairs]);

  const pairedResults = useMemo(() => {
    if (!selectedPerson) return [];
    const raw = findPotentialMatches(selectedPerson, active, matches, dismissedPairs);
    return raw.filter((r) => {
      const other = r.personA.id === selectedPerson.id ? r.personB : r.personA;
      return isInActivePair(other.id, matches);
    });
  }, [selectedPerson, active, matches, dismissedPairs]);

  const dismissedForSelected = useMemo(() => {
    if (!selectedPerson) return [];
    return dismissedPairs.filter(([a, b]) => a === selectedPerson.id || b === selectedPerson.id);
  }, [dismissedPairs, selectedPerson]);

  const failedPairsForSelected = useMemo(() => {
    if (!selectedPerson) return [];
    return matches.filter(
      (m) =>
        m.outcome === 'failed' &&
        (m.person_1_id === selectedPerson.id || m.person_2_id === selectedPerson.id),
    );
  }, [matches, selectedPerson]);

  const selectedActiveMatch = useMemo(() => {
    if (!selectedPerson) return null;
    return matches.find(
      (m) =>
        m.outcome === 'pending' &&
        (m.person_1_id === selectedPerson.id || m.person_2_id === selectedPerson.id),
    ) ?? null;
  }, [matches, selectedPerson]);

  const selectedInActivePair = !!selectedActiveMatch;

  const handleInitiate = async (result: CompatibilityResult) => {
    await initiatePair(result.personA.id, result.personB.id);
  };

  const confirmDismiss = () => {
    if (!dismissConfirm) return;
    dismissPotentialMatch(dismissConfirm.aId, dismissConfirm.bId, dismissNote.trim());
    setDismissConfirm(null);
    setDismissNote('');
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Matchmaking Engine</h2>
        <p className="text-sm text-slate-400">
          Strict bidirectional compatibility matching. Select a candidate to see ranked
          potential matches.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Candidate picker */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
            <div className="mb-2 flex gap-1 rounded-lg border border-slate-700/60 bg-slate-950/40 p-0.5">
              {(['male', 'female'] as PickerGender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => {
                    setPickerGender(g);
                    setSelectedPerson(null);
                  }}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    pickerGender === g
                      ? g === 'male'
                        ? 'bg-sky-600 text-white'
                        : 'bg-rose-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {g === 'male' ? 'Brothers' : 'Sisters'}
                </button>
              ))}
            </div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-3.5 w-3.5" /> Select Candidate
            </p>
            <div className="max-h-[440px] space-y-1 overflow-y-auto pr-1">
              {candidates.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-500">
                  No {pickerGender === 'male' ? 'brothers' : 'sisters'} available.
                </p>
              ) : (
                candidates.map((p) => {
                  const activePair = isInActivePair(p.id, matches);
                  return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPerson(p)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                      selectedPerson?.id === p.id
                        ? 'bg-sky-600/20 ring-1 ring-sky-500/40'
                        : 'hover:bg-slate-800'
                    } ${activePair ? 'opacity-60' : ''}`}
                  >
                    <Avatar person={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-slate-200">{p.full_name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.age && `${p.age} • `}
                        {countPotentialMatches(p, active, matches, dismissedPairs) - countPotentialMatchesAlreadyPaired(p, active, matches, dismissedPairs)} matches • {matches.filter((m) => (m.person_1_id === p.id || m.person_2_id === p.id) && m.outcome !== 'pending').length} prior
                      </p>
                    </div>
                    {activePair && (
                      <HeartHandshake className="h-4 w-4 shrink-0 text-emerald-400" title="In an active pair" />
                    )}
                  </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {!selectedPerson ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
              <Heart className="mb-2 h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-500">
                Pick a candidate on the left to generate potential matches.
              </p>
            </div>
          ) : (
            <>
              {selectedActiveMatch && (() => {
                const partnerId =
                  selectedActiveMatch.person_1_id === selectedPerson.id
                    ? selectedActiveMatch.person_2_id
                    : selectedActiveMatch.person_1_id;
                const partner = active.find((p) => p.id === partnerId);
                if (!partner) return null;
                return (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar person={partner} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Currently Paired With
                        </p>
                        <h3 className="truncate text-sm font-semibold text-slate-100">
                          {partner.full_name}
                        </h3>
                        <p className="truncate text-xs text-slate-500">
                          {partner.age && `${partner.age} • `}
                          {partner.location}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
                        <HeartHandshake className="h-3 w-3" /> Active Pair
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => {
                          const compat = findPotentialMatches(selectedPerson, active, matches, dismissedPairs)
                            .find((r) =>
                              (r.personA.id === selectedPerson.id && r.personB.id === partner.id) ||
                              (r.personB.id === selectedPerson.id && r.personA.id === partner.id),
                            );
                          if (compat) setDetailResult(compat);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
                      >
                        <ArrowRightLeft className="h-3.5 w-3.5" /> View Details
                      </button>
                      <button
                        onClick={() => setUnpairTarget(selectedActiveMatch)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
                        title="Silently unpair without recording in history"
                      >
                        <Unplug className="h-3.5 w-3.5" /> Unpair
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      This candidate is currently in an active pair. Initiating new pairs is
                      disabled until this pairing is resolved.
                    </p>
                  </div>
                );
              })()}
              <p className="text-sm text-slate-400">
                Showing <span className="text-slate-200">{results.length}</span> valid
                matches, ranked by ethnicity preference and shared hobbies.
              </p>
              {results.length === 0 && dismissedForSelected.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
                  <p className="text-sm text-slate-500">
                    No valid matches found. All candidates must pass every bidirectional
                    criteria check. Try syncing new candidates.
                  </p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
                  <p className="text-sm text-slate-500">
                    No new matches — all potential matches have been dismissed or paired.
                    Restore a dismissed pair below to see it again.
                  </p>
                </div>
              ) : (
                results.map((r, idx) => {
                  const other = r.personA.id === selectedPerson.id ? r.personB : r.personA;
                  const otherActive = isInActivePair(other.id, matches);
                  return (
                  <MatchCard
                    key={`${r.personA.id}-${r.personB.id}`}
                    result={r}
                    rank={idx}
                    candidate={selectedPerson}
                    matchActive={otherActive}
                    initiateDisabled={selectedInActivePair || otherActive}
                    onInitiate={() => handleInitiate(r)}
                    onDismiss={() => {
                      setDismissConfirm({ aId: selectedPerson.id, bId: other.id });
                      setDismissNote('');
                    }}
                    onView={() => setDetailResult(r)}
                  />
                  );
                })
              )}

              {/* Matches with already-paired candidates */}
              {pairedResults.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3">
                  <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <HeartHandshake className="h-3.5 w-3.5" /> Matched but Already Paired ({pairedResults.length})
                  </p>
                  <div className="space-y-2">
                    {pairedResults.map((r) => {
                      const other = r.personA.id === selectedPerson.id ? r.personB : r.personA;
                      const hobbies = sharedHobbies(r.personA, r.personB);
                      return (
                        <div
                          key={`${r.personA.id}-${r.personB.id}`}
                          className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-3 opacity-70"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar person={other} size="md" />
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-slate-100">{other.full_name}</h3>
                              <p className="truncate text-xs text-slate-500">
                                {other.age && `${other.age} • `}
                                {other.location}
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
                              <HeartHandshake className="h-3 w-3" /> In Active Pair
                            </span>
                          </div>
                          {hobbies.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <span className="text-xs text-slate-500">Shared hobbies:</span>
                              {hobbies.map((h) => (
                                <span key={h} className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
                                  {h}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-3 flex justify-end gap-2">
                            <button
                              onClick={() => setDetailResult(r)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-1.5 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" /> Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Failed pairs with restore option */}
              {failedPairsForSelected.length > 0 && (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-400">
                    <XCircle className="h-3.5 w-3.5" /> Didn't Work Out ({failedPairsForSelected.length})
                  </p>
                  <div className="space-y-1.5">
                    {failedPairsForSelected.map((m) => {
                      const otherId = m.person_1_id === selectedPerson.id ? m.person_2_id : m.person_1_id;
                      const other = active.find((p) => p.id === otherId) ?? people.find((p) => p.id === otherId);
                      if (!other) return null;
                      return (
                        <div
                          key={m.id}
                          className="rounded-lg bg-slate-950/40 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar person={other} size="sm" />
                            <span className="flex-1 truncate text-sm text-slate-400">
                              {other.full_name}
                            </span>
                            <button
                              onClick={() => setRestoreFailedTarget(m)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-sky-500/40 hover:text-sky-300"
                            >
                              <RotateCcw className="h-3 w-3" /> Restore
                            </button>
                          </div>
                          {m.notes && (
                            <p className="mt-1.5 pl-9 text-xs text-slate-500">{m.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dismissed pairs with restore option */}
              {dismissedForSelected.length > 0 && (
                <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dismissed Pairs ({dismissedForSelected.length})
                  </p>
                  <div className="space-y-1.5">
                    {dismissedForSelected.map(([aId, bId, note]) => {
                      const otherId = aId === selectedPerson.id ? bId : aId;
                      const other = active.find((p) => p.id === otherId);
                      if (!other) return null;
                      return (
                        <div
                          key={`${aId}-${bId}`}
                          className="rounded-lg bg-slate-950/40 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar person={other} size="sm" />
                            <span className="flex-1 truncate text-sm text-slate-400">
                              {other.full_name}
                            </span>
                            <button
                              onClick={() => undismissPair(aId, bId)}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-sky-500/40 hover:text-sky-300"
                            >
                              <RotateCcw className="h-3 w-3" /> Restore
                            </button>
                          </div>
                          {note && (
                            <p className="mt-1.5 pl-9 text-xs text-slate-500">{note}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dismiss confirmation */}
      <Modal
        open={!!dismissConfirm}
        onClose={() => setDismissConfirm(null)}
        title="Dismiss this match?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to dismiss this potential match? You can restore it later
            from the dismissed pairs list below the results.
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Note (optional)
            </label>
            <textarea
              value={dismissNote}
              onChange={(e) => setDismissNote(e.target.value)}
              rows={3}
              placeholder="Reason for dismissing this pair..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setDismissConfirm(null)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={confirmDismiss}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
            >
              <X className="h-4 w-4" /> Yes, Dismiss
            </button>
          </div>
        </div>
      </Modal>

      {/* Match details modal */}
      <Modal
        open={!!detailResult}
        onClose={() => setDetailResult(null)}
        title="Match Details"
        maxWidth="max-w-4xl"
      >
        {detailResult && (() => {
          const match = detailResult.personA.id === selectedPerson?.id
            ? detailResult.personB
            : detailResult.personA;
          const candidate = detailResult.personA.id === selectedPerson?.id
            ? detailResult.personA
            : detailResult.personB;
          return (
            <div className="space-y-5">
              {/* Both photos and names */}
              <div className="flex items-center justify-around gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-5">
                <PersonHeader
                  person={candidate}
                  onPhotoClick={() => setPhotoView({
                    photos: candidate.photo_urls.length > 0 ? candidate.photo_urls : (candidate.profile_photo_url ? [candidate.profile_photo_url] : []),
                    name: candidate.full_name,
                  })}
                />
                <div className="flex flex-col items-center text-slate-500">
                  <Users className="h-7 w-7 text-sky-400" />
                  <span className="mt-1 text-[10px] uppercase tracking-wider">Under Consideration</span>
                </div>
                <PersonHeader
                  person={match}
                  onPhotoClick={() => setPhotoView({
                    photos: match.photo_urls.length > 0 ? match.photo_urls : (match.profile_photo_url ? [match.profile_photo_url] : []),
                    name: match.full_name,
                  })}
                />
              </div>

              {/* Bio Data submission links */}
              <div className="flex justify-center gap-3">
                {candidate.bio_data_url ? (
                  <a
                    href={candidate.bio_data_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {candidate.full_name}'s Bio Data
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-500">
                    <ExternalLink className="h-3.5 w-3.5" /> {candidate.full_name}'s Bio Data (not available)
                  </span>
                )}
                {match.bio_data_url ? (
                  <a
                    href={match.bio_data_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> {match.full_name}'s Bio Data
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-500">
                    <ExternalLink className="h-3.5 w-3.5" /> {match.full_name}'s Bio Data (not available)
                  </span>
                )}
              </div>

              {sharedHobbies(detailResult.personA, detailResult.personB).length > 0 && (
                <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-950/40 px-3 py-2">
                  <span className="text-xs text-slate-500">Shared hobbies:</span>
                  {sharedHobbies(detailResult.personA, detailResult.personB).map((h) => (
                    <span key={h} className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300">
                      {h}
                    </span>
                  ))}
                </div>
              )}

              <AdminNote name={candidate.full_name} note={candidate.admin_note} />
              <AdminNote name={match.full_name} note={match.admin_note} />

              {/* Collapsible: all responses side by side */}
              <AllResponsesSection candidate={candidate} match={match} />

              <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
                <button
                  onClick={() => {
                    const other = detailResult.personA.id === selectedPerson?.id
                      ? detailResult.personB
                      : detailResult.personA;
                    setDismissConfirm({ aId: selectedPerson!.id, bId: other.id });
                    setDismissNote('');
                    setDetailResult(null);
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => {
                    handleInitiate(detailResult);
                    setDetailResult(null);
                  }}
                  disabled={selectedInActivePair}
                  title={selectedInActivePair ? 'Candidate is already in an active pair' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                    selectedInActivePair
                      ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  <Heart className="h-4 w-4" /> Initiate Pair
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {photoView && (
        <PhotoCarousel
          photos={photoView.photos}
          name={photoView.name}
          onClose={() => setPhotoView(null)}
        />
      )}

      {unpairTarget && (
        <Modal
          open={!!unpairTarget}
          onClose={() => setUnpairTarget(null)}
          title="Unpair?"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Silently unpair this active pair? Both candidates will return to the pool
              and can match with each other again. No record of this pairing will be kept
              in history.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUnpairTarget(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (unpairTarget) deleteMatch(unpairTarget.id);
                  setUnpairTarget(null);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-600"
              >
                <Unplug className="h-4 w-4" /> Yes, Unpair
              </button>
            </div>
          </div>
        </Modal>
      )}

      {restoreFailedTarget && (() => {
        const otherId =
          restoreFailedTarget.person_1_id === selectedPerson?.id
            ? restoreFailedTarget.person_2_id
            : restoreFailedTarget.person_1_id;
        const other = people.find((p) => p.id === otherId);
        return (
          <Modal
            open={!!restoreFailedTarget}
            onClose={() => setRestoreFailedTarget(null)}
            title="Restore this pair?"
            maxWidth="max-w-md"
          >
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                This pair was marked as "didn't work out." Restoring will delete that
                record so {selectedPerson?.full_name} and{' '}
                <span className="font-semibold text-slate-100">
                  {other?.full_name ?? 'this candidate'}
                </span>{' '}
                can be matched with each other again.
              </p>
              {restoreFailedTarget.notes && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                    <StickyNote className="h-3.5 w-3.5" /> Original note
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{restoreFailedTarget.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRestoreFailedTarget(null)}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (restoreFailedTarget) deleteMatch(restoreFailedTarget.id);
                    setRestoreFailedTarget(null);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                >
                  <RotateCcw className="h-4 w-4" /> Yes, Restore
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}

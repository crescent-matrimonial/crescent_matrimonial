import { useMemo, useState } from 'react';
import { Heart, X, Check, ArrowRightLeft, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '@/lib/data';
import { Avatar } from '@/components/Avatar';
import { Modal } from '@/components/Modal';
import { computeCompatibility, findPotentialMatches } from '@/lib/matching';
import type { CompatibilityResult, Person } from '@/lib/types';

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-rose-400';
  const stroke =
    score >= 75 ? '#34d399' : score >= 50 ? '#fbbf24' : '#fb7185';
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-20 w-20">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r="28"
          fill="none"
          stroke={stroke}
          strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${color}`}>
        {score}%
      </div>
    </div>
  );
}

function CompatibilityTable({ result }: { result: CompatibilityResult }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700/60 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 text-left font-medium">
              {result.personA.full_name}'s Profile
            </th>
            <th className="px-3 py-2 text-center font-medium">A → B</th>
            <th className="px-3 py-2 text-left font-medium">
              {result.personB.full_name}'s Criteria
            </th>
            <th className="px-3 py-2 text-center font-medium">B → A</th>
            <th className="px-3 py-2 text-left font-medium">
              {result.personB.full_name}'s Profile
            </th>
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row) => (
            <tr
              key={row.key}
              className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40"
            >
              <td className="px-3 py-2 text-slate-300">
                <div className="text-xs text-slate-500">{row.questionA}</div>
                <div>{row.answerA.join(', ') || '—'}</div>
              </td>
              <td className="px-3 py-2 text-center">
                {row.aMatchesB ? (
                  <Check className="mx-auto h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="mx-auto h-4 w-4 text-rose-400" />
                )}
              </td>
              <td className="px-3 py-2 text-slate-300">
                <div className="text-xs text-slate-500">{row.questionB}</div>
                <div>{row.criteriaB.join(', ') || '—'}</div>
              </td>
              <td className="px-3 py-2 text-center">
                {row.bMatchesA ? (
                  <Check className="mx-auto h-4 w-4 text-emerald-400" />
                ) : (
                  <X className="mx-auto h-4 w-4 text-rose-400" />
                )}
              </td>
              <td className="px-3 py-2 text-slate-300">
                <div className="text-xs text-slate-500">{row.questionA}</div>
                <div>{row.answerB.join(', ') || '—'}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchCard({
  result,
  onInitiate,
  onDismiss,
  onView,
}: {
  result: CompatibilityResult;
  onInitiate: () => void;
  onDismiss: () => void;
  onView: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { personA, personB, score, passed, total } = result;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
      <div className="flex items-center gap-4">
        <div className="flex flex-1 items-center gap-3">
          <Avatar person={personA} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-100">
              {personA.full_name}
            </p>
            <p className="truncate text-xs text-slate-500">
              {personA.age && `${personA.age} • `}
              {personA.location}
            </p>
          </div>
        </div>

        <ScoreRing score={score} />

        <div className="flex flex-1 items-center gap-3">
          <div className="min-w-0 flex-1 text-right">
            <p className="truncate text-sm font-semibold text-slate-100">
              {personB.full_name}
            </p>
            <p className="truncate text-xs text-slate-500">
              {personB.age && `${personB.age} • `}
              {personB.location}
            </p>
          </div>
          <Avatar person={personB} size="md" />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>
          {passed}/{total} criteria aligned both ways
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
        >
          {expanded ? (
            <>
              Hide details <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View comparison <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <CompatibilityTable result={result} />
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500"
        >
          <Heart className="h-3.5 w-3.5" /> Initiate Pair
        </button>
      </div>
    </div>
  );
}

export function MatchmakingEngine() {
  const { people, matches, dismissedPairs, initiatePair, dismissPotentialMatch } = useData();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [detailResult, setDetailResult] = useState<CompatibilityResult | null>(null);
  const [minScore, setMinScore] = useState(0);

  const active = useMemo(() => people.filter((p) => !p.is_deleted), [people]);

  const candidates = useMemo(
    () => active.filter((p) => p.gender === 'male'),
    [active],
  );

  const results = useMemo(() => {
    if (!selectedPerson) return [];
    return findPotentialMatches(selectedPerson, active, matches, dismissedPairs).filter(
      (r) => r.score >= minScore,
    );
  }, [selectedPerson, active, matches, dismissedPairs, minScore]);

  const handleInitiate = async (result: CompatibilityResult) => {
    await initiatePair(result.personA.id, result.personB.id);
    dismissPotentialMatch(result.personA.id, result.personB.id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-slate-100">Matchmaking Engine</h2>
        <p className="text-sm text-slate-400">
          Two-way cross-section compatibility scoring. Select a candidate to see ranked
          potential matches.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Candidate picker */}
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Sparkles className="h-3.5 w-3.5" /> Select Candidate
            </p>
            <div className="max-h-[480px] space-y-1 overflow-y-auto pr-1">
              {candidates.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPerson(p)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                    selectedPerson?.id === p.id
                      ? 'bg-sky-600/20 ring-1 ring-sky-500/40'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <Avatar person={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{p.full_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.age && `${p.age} • `}
                      {p.location}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedPerson && (
            <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-3">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Min. Score: {minScore}%
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="w-full accent-sky-500"
              />
            </div>
          )}
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
          ) : results.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 text-center">
              <p className="text-sm text-slate-500">
                No potential matches above {minScore}% found. Try lowering the threshold or
                syncing new candidates.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-400">
                Showing <span className="text-slate-200">{results.length}</span> potential
                matches for{' '}
                <span className="text-slate-200">{selectedPerson.full_name}</span>, sorted by
                compatibility.
              </p>
              {results.map((r) => (
                <MatchCard
                  key={`${r.personA.id}-${r.personB.id}`}
                  result={r}
                  onInitiate={() => handleInitiate(r)}
                  onDismiss={() =>
                    dismissPotentialMatch(r.personA.id, r.personB.id)
                  }
                  onView={() => setDetailResult(r)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      <Modal
        open={!!detailResult}
        onClose={() => setDetailResult(null)}
        title="Compatibility Breakdown"
        maxWidth="max-w-4xl"
      >
        {detailResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <Avatar person={detailResult.personA} size="lg" />
                <p className="mt-2 text-sm font-medium text-slate-200">
                  {detailResult.personA.full_name}
                </p>
              </div>
              <ScoreRing score={detailResult.score} />
              <div className="text-center">
                <Avatar person={detailResult.personB} size="lg" />
                <p className="mt-2 text-sm font-medium text-slate-200">
                  {detailResult.personB.full_name}
                </p>
              </div>
            </div>
            <CompatibilityTable result={detailResult} />
            <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
              <button
                onClick={() => {
                  dismissPotentialMatch(detailResult.personA.id, detailResult.personB.id);
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                <Heart className="h-4 w-4" /> Initiate Pair
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Search, Check, X, ArrowRightLeft } from 'lucide-react';
import { Avatar } from './Avatar';
import { computeCompatibility } from '@/lib/matching';
import { useData } from '@/lib/data';
import type { PersonWithDetails, CompatibilityRow } from '@/lib/types';

interface ComparisonSearchProps {
  person: PersonWithDetails;
}

function StatusIcon({ pass }: { pass: boolean }) {
  return pass ? (
    <span className="inline-flex items-center justify-center rounded-full bg-emerald-500/15 p-0.5">
      <Check className="h-3.5 w-3.5 text-emerald-400" />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center rounded-full bg-rose-500/15 p-0.5">
      <X className="h-3.5 w-3.5 text-rose-400" />
    </span>
  );
}

function RuleRow({
  row,
  personA,
  personB,
}: {
  row: CompatibilityRow;
  personA: PersonWithDetails;
  personB: PersonWithDetails;
}) {
  const bothPass = row.aMatchesB && row.bMatchesA;
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`rounded-lg border ${
        bothPass
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-rose-500/20 bg-rose-500/5'
      }`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <StatusIcon pass={bothPass} />
        <span className="flex-1 text-sm font-medium text-slate-200">
          {row.questionA}
        </span>
        {!bothPass && (
          <span className="text-xs text-rose-300">
            {!row.aMatchesB && !row.bMatchesA
              ? 'Neither direction'
              : !row.aMatchesB
                ? `${personB.full_name} → ${personA.full_name} only`
                : `${personA.full_name} → ${personB.full_name} only`}
          </span>
        )}
        <span className="text-xs text-slate-500">{open ? 'Hide' : 'Details'}</span>
      </button>
      {open && (
        <div className="border-t border-slate-700/40 px-3 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Person A side */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {personA.full_name}
              </p>
              <div className="rounded-md bg-slate-950/40 px-2.5 py-2 text-xs text-slate-300">
                {row.answerA.length > 0 ? (
                  row.multi && row.answerA.length > 1 ? (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {row.answerA.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  ) : (
                    row.answerA.join(', ')
                  )
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
            {/* Person B side */}
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {personB.full_name}
              </p>
              <div className="rounded-md bg-slate-950/40 px-2.5 py-2 text-xs text-slate-300">
                {row.answerB.length > 0 ? (
                  row.multi && row.answerB.length > 1 ? (
                    <ul className="list-disc pl-4 space-y-0.5">
                      {row.answerB.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  ) : (
                    row.answerB.join(', ')
                  )
                ) : (
                  <span className="text-slate-600">—</span>
                )}
              </div>
            </div>
          </div>
          {/* Direction indicators */}
          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:gap-4">
            <div className="flex items-center gap-2 text-xs">
              <StatusIcon pass={row.aMatchesB} />
              <span className="text-slate-400">
                {personA.full_name}'s preferences → {personB.full_name}'s answers
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <StatusIcon pass={row.bMatchesA} />
              <span className="text-slate-400">
                {personB.full_name}'s preferences → {personA.full_name}'s answers
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ComparisonSearch({ person }: ComparisonSearchProps) {
  const { people } = useData();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<PersonWithDetails | null>(null);

  const oppositeGender = person.gender === 'male' ? 'female' : 'male';

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return people
      .filter(
        (p) =>
          p.id !== person.id &&
          p.gender === oppositeGender &&
          !p.is_deleted &&
          p.full_name.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [query, people, person.id, oppositeGender]);

  const result = useMemo(() => {
    if (!selected) return null;
    return computeCompatibility(person, selected);
  }, [person, selected]);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ArrowRightLeft className="h-4 w-4 text-sky-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Compare With Another Candidate
        </h4>
      </div>

      {!selected ? (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search for a ${oppositeGender === 'female' ? 'sister' : 'brother'} by name...`}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition focus:border-sky-500"
            />
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 space-y-1">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelected(p);
                    setQuery('');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2 text-left transition hover:border-sky-500/40 hover:bg-slate-800/40"
                >
                  <Avatar person={p} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">{p.full_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.age != null && `${p.age} • `}
                      {p.location ?? 'Location unknown'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.trim() && searchResults.length === 0 && (
            <p className="mt-2 text-xs text-slate-500">
              No {oppositeGender === 'female' ? 'sisters' : 'brothers'} found matching "{query}".
            </p>
          )}
        </>
      ) : (
        <>
          {/* Selected person header + score */}
          <div className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5">
            <Avatar person={selected} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-100">
                {selected.full_name}
              </p>
              <p className="truncate text-xs text-slate-500">
                {selected.age != null && `${selected.age} • `}
                {selected.location ?? 'Location unknown'}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-lg font-bold ${
                result?.score === 100
                  ? 'text-emerald-400'
                  : (result?.score ?? 0) >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}>
                {result?.score ?? 0}%
              </p>
              <p className="text-xs text-slate-500">
                {result?.passed ?? 0}/{result?.total ?? 0} rules
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="ml-2 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            >
              Change
            </button>
          </div>

          {/* Per-rule breakdown */}
          {result && (
            <div className="mt-3 space-y-1.5">
              {result.rows.map((row) => (
                <RuleRow
                  key={row.key}
                  row={row}
                  personA={person}
                  personB={selected}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

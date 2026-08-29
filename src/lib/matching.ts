import type { CompatibilityResult, CompatibilityRow, Match, Person } from './types';

/**
 * Two-way cross-section alignment rules.
 *
 * For each question pair where Candidate A's "About You" answer maps to
 * Candidate B's corresponding "What You're Looking For" criteria:
 *  - Single-select: A's value must match B's criteria 100% identically.
 *  - Multi-select:  at least one of A's values must appear in B's criteria.
 *
 * The match must pass BOTH directions (A about -> B looking AND B about -> A
 * looking) to count toward the compatibility score.
 */

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Heuristic: pair an "About You" key with its "Looking For" counterpart. */
function pairKeys(aboutKey: string, lookingKeys: string[]): string | null {
  // Direct slug match on the core question (strip "partner_s_" prefix used in
  // "Partner's ..." looking-for headers).
  const normalizedAbout = aboutKey.replace(/^your_/, '');
  for (const lk of lookingKeys) {
    const normalizedLooking = lk.replace(/^partner_s_/, '').replace(/^partner_/, '')
    if (normalizedLooking === normalizedAbout) return lk;
  }
  // Looser contains check.
  for (const lk of lookingKeys) {
    const normalizedLooking = lk.replace(/^partner_s_/, '').replace(/^partner_/, '')
    if (normalizedLooking.includes(normalizedAbout) || normalizedAbout.includes(normalizedLooking)) {
      return lk;
    }
  }
  return null;
}

function normList(values: string[]): string[] {
  return values
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function singleMatch(answer: string[], criteria: string[]): boolean {
  const a = normList(answer);
  const c = normList(criteria);
  if (a.length === 0 || c.length === 0) return false;
  // 100% identical: every answer value equals every criteria value (as sets).
  if (a.length !== c.length) return false;
  return a.every((v) => c.includes(v));
}

function multiMatch(answer: string[], criteria: string[]): boolean {
  const a = normList(answer);
  const c = normList(criteria);
  if (a.length === 0 || c.length === 0) return false;
  return a.some((v) => c.includes(v));
}

/**
 * Compute a bi-directional compatibility result between two candidates.
 * Returns the score, passed/total counts, and per-criterion rows.
 */
export function computeCompatibility(a: Person, b: Person): CompatibilityResult {
  const rows: CompatibilityRow[] = [];
  let passed = 0;
  let total = 0;

  const aboutAKeys = Object.keys(a.about_you);
  const aboutBKeys = Object.keys(b.about_you);
  const lookingAKeys = Object.keys(a.looking_for);
  const lookingBKeys = Object.keys(b.looking_for);

  const seenKeys = new Set<string>();

  for (const aboutKey of aboutAKeys) {
    const fieldA = a.about_you[aboutKey];
    const lookingKeyB = pairKeys(aboutKey, lookingBKeys);
    const aboutKeyB = pairKeys(aboutKey, aboutBKeys);
    if (!lookingKeyB) continue;

    const criteriaB = b.looking_for[lookingKeyB];
    const fieldB = aboutKeyB ? b.about_you[aboutKeyB] : undefined;
    const lookingKeyA = fieldB ? pairKeys(aboutKeyB!, lookingAKeys) : null;
    const criteriaA = lookingKeyA ? a.looking_for[lookingKeyA] : undefined;

    const multi = fieldA.multi || criteriaB.multi;
    const matchFn = multi ? multiMatch : singleMatch;
    const aMatchesB = matchFn(fieldA.values, criteriaB.values);
    const bMatchesA = fieldB && criteriaA ? matchFn(fieldB.values, criteriaA.values) : false;

    const key = `${aboutKey}::${lookingKeyB}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    total += 1;
    if (aMatchesB && bMatchesA) passed += 1;

    rows.push({
      key,
      questionA: fieldA.question,
      questionB: criteriaB.question,
      answerA: fieldA.values,
      criteriaB: criteriaB.values,
      aMatchesB,
      answerB: fieldB?.values ?? [],
      criteriaA: criteriaA?.values ?? [],
      bMatchesA,
      multi,
    });
  }

  const score = total === 0 ? 0 : Math.round((passed / total) * 100);

  return {
    personA: a,
    personB: b,
    score,
    total,
    passed,
    rows,
  };
}

/**
 * Compute potential matches for a candidate across the opposite-gender pool,
 * filtering out pairs already in matches (any outcome) and dismissed pairs.
 * Returns results sorted by score descending.
 */
export function findPotentialMatches(
  candidate: Person,
  pool: Person[],
  existingMatches: Match[],
  dismissedPairs: Array<[string, string]>,
): CompatibilityResult[] {
  const pairKey = (x: string, y: string) => [x, y].sort().join('|');
  const blocked = new Set<string>([
    ...existingMatches.map((m) => pairKey(m.person_1_id, m.person_2_id)),
    ...dismissedPairs.map(([x, y]) => pairKey(x, y)),
  ]);

  const opposite = pool.filter(
    (p) =>
      p.id !== candidate.id &&
      p.gender !== candidate.gender &&
      !p.is_deleted &&
      !blocked.has(pairKey(candidate.id, p.id)),
  );

  return opposite
    .map((p) => computeCompatibility(candidate, p))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.score - a.score);
}

/** Convenience: count potential matches for a candidate (for directory badge). */
export function countPotentialMatches(
  candidate: Person,
  pool: Person[],
  existingMatches: Match[],
  dismissedPairs: Array<[string, string]>,
): number {
  return findPotentialMatches(candidate, pool, existingMatches, dismissedPairs).length;
}

export { slug };

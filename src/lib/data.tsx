import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, hasConfiguredKey } from './supabaseClient';
import { MOCK_MATCHES, MOCK_PEOPLE, MOCK_SHEET_PROFILES } from './mockData';
import { fetchAllSheetProfiles, type SheetProfile } from './sheets';
import { fromDbGender, toDbGender, type Match, type Outcome, type Person, type PersonWithDetails, type DismissedPair } from './types';
import { computeCompatibility } from './matching';

interface DataContextValue {
  people: PersonWithDetails[];
  matches: Match[];
  loading: boolean;
  error: string | null;
  useMock: boolean;
  dismissedPairs: Array<[string, string, string]>;
  sheetProfiles: Map<string, SheetProfile>;
  refresh: () => Promise<void>;
  syncFromSheets: () => Promise<number>;
  softDeletePerson: (id: string) => Promise<void>;
  restorePerson: (id: string) => Promise<void>;
  hardDeletePerson: (id: string) => Promise<void>;
  initiatePair: (aId: string, bId: string) => Promise<void>;
  updateMatch: (id: string, patch: Partial<Match>) => Promise<void>;
  archivePair: (id: string, outcome: Exclude<Outcome, 'pending'>, notes: string) => Promise<void>;
  deleteMatch: (id: string) => Promise<void>;
  dismissPotentialMatch: (aId: string, bId: string, note: string) => void;
  undismissPair: (aId: string, bId: string) => void;
  seedSampleData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function rowToDismissed(row: Record<string, unknown>): DismissedPair {
  return {
    id: String(row.id),
    person_a_id: String(row.person_a_id),
    person_b_id: String(row.person_b_id),
    note: (row.note as string) ?? '',
    created_at: String(row.created_at),
  };
}

function dismissedToTuple(d: DismissedPair): [string, string, string] {
  return [d.person_a_id, d.person_b_id, d.note];
}

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    email: String(row.email ?? ''),
    gender: fromDbGender(row.gender as string) ?? 'male',
    is_deleted: Boolean(row.is_deleted),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToMatch(row: Record<string, unknown>): Match {
  return {
    id: String(row.id),
    person_1_id: String(row.person_1_id),
    person_2_id: String(row.person_2_id),
    paired_at: String(row.paired_at),
    exchanged_contact: Boolean(row.exchanged_contact),
    outcome: (row.outcome as Outcome) ?? 'pending',
    outcome_set_at: (row.outcome_set_at as string) ?? null,
    notes: (row.notes as string) ?? null,
  };
}

/** Merge a DB person with sheet-sourced profile data (matched by email). */
function enrichPerson(person: Person, profiles: Map<string, SheetProfile>): PersonWithDetails {
  const profile = person.email ? profiles.get(person.email.toLowerCase()) : undefined;
  if (profile) {
    return {
      ...person,
      age: profile.age,
      location: profile.location,
      occupation: profile.occupation,
      profile_photo_url: profile.profile_photo_url,
      photo_urls: profile.photo_urls,
      admin_note: profile.admin_note,
      bio_data_url: profile.bio_data_url,
      about_you: profile.about_you,
      looking_for: profile.looking_for,
    };
  }
  return {
    ...person,
    age: null,
    location: null,
    occupation: null,
    profile_photo_url: null,
    photo_urls: [],
    admin_note: null,
    bio_data_url: null,
    about_you: {},
    looking_for: {},
  };
}

/** Auto-sync pending matches: create new matches for full-compatible pairs, remove stale ones. */
async function autoSyncMatches(
  supabase: ReturnType<typeof getSupabase>,
  enrichedPeople: PersonWithDetails[],
  existingMatches: Match[],
  dismissed: Array<[string, string, string]>,
): Promise<void> {
  const pairKey = (x: string, y: string) => [x, y].sort().join('|');

  const blocked = new Set<string>([
    ...existingMatches
      .filter((m) => m.outcome === 'failed' || m.outcome === 'manually_removed' || m.outcome === 'worked_out')
      .map((m) => pairKey(m.person_1_id, m.person_2_id)),
    ...dismissed.map(([x, y]) => pairKey(x, y)),
  ]);

  const existingPending = new Set<string>(
    existingMatches
      .filter((m) => m.outcome === 'pending')
      .map((m) => pairKey(m.person_1_id, m.person_2_id)),
  );

  const activeMales = enrichedPeople.filter((p) => !p.is_deleted && p.gender === 'male');
  const activeFemales = enrichedPeople.filter((p) => !p.is_deleted && p.gender === 'female');

  const fullMatchPairs: Array<{ maleId: string; femaleId: string }> = [];
  for (const male of activeMales) {
    for (const female of activeFemales) {
      const key = pairKey(male.id, female.id);
      if (blocked.has(key)) continue;
      const result = computeCompatibility(male, female);
      if (result.score === 100) {
        fullMatchPairs.push({ maleId: male.id, femaleId: female.id });
      }
    }
  }

  const fullMatchKeys = new Set(fullMatchPairs.map((p) => pairKey(p.maleId, p.femaleId)));

  const toInsert = fullMatchPairs.filter((p) => !existingPending.has(pairKey(p.maleId, p.femaleId)));
  const toDelete = existingMatches.filter(
    (m) => m.outcome === 'pending' && !fullMatchKeys.has(pairKey(m.person_1_id, m.person_2_id)),
  );

  if (toInsert.length > 0) {
    const rows = toInsert.map((p) => ({
      person_1_id: p.maleId,
      person_2_id: p.femaleId,
      paired_at: new Date().toISOString(),
      exchanged_contact: false,
      outcome: 'pending',
    }));
    const { error } = await supabase.from('matches').insert(rows);
    if (error) console.error('Auto-sync: failed to insert new matches:', error);
  }

  if (toDelete.length > 0) {
    for (const m of toDelete) {
      const { error } = await supabase.from('matches').delete().eq('id', m.id);
      if (error) console.error('Auto-sync: failed to delete stale match:', error);
    }
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<PersonWithDetails[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sheetProfiles, setSheetProfiles] = useState<Map<string, SheetProfile>>(new Map());
  const [dismissedPairs, setDismissedPairs] = useState<Array<[string, string, string]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useMock = !hasConfiguredKey();

  const refresh = useCallback(async (freshProfiles?: Map<string, SheetProfile>, runAutoMatch?: boolean) => {
    setLoading(true);
    setError(null);
    if (useMock) {
      const mockProfiles = new Map<string, SheetProfile>();
      MOCK_SHEET_PROFILES.forEach((p) => mockProfiles.set(p.email.toLowerCase(), p));
      setSheetProfiles(mockProfiles);
      setPeople(MOCK_PEOPLE.map((p) => enrichPerson(p, mockProfiles)));
      setMatches(MOCK_MATCHES);
      setDismissedPairs([]);
      setLoading(false);
      return;
    }
    try {
      const supabase = getSupabase();
      const [{ data: peopleData, error: pErr }, { data: matchData, error: mErr }, dismissedRes] =
        await Promise.all([
          supabase.from('people').select('*').order('created_at', { ascending: false }),
          supabase.from('matches').select('*').order('paired_at', { ascending: false }),
          supabase.from('dismissed_pairs').select('*').order('created_at', { ascending: false }),
        ]);
      if (pErr) throw pErr;
      if (mErr) throw mErr;

      const basePeople = (peopleData ?? []).map(rowToPerson);
      const profiles = freshProfiles ?? (sheetProfiles.size > 0
        ? sheetProfiles
        : await fetchAllSheetProfiles().catch(() => new Map<string, SheetProfile>()));
      setSheetProfiles(profiles);
      const enrichedPeople = basePeople.map((p) => enrichPerson(p, profiles));
      setPeople(enrichedPeople);
      const currentMatches = (matchData ?? []).map(rowToMatch);
      setMatches(currentMatches);
      const currentDismissed = (dismissedRes.data ?? []).map(rowToDismissed).map(dismissedToTuple);
      setDismissedPairs(currentDismissed);

      if (runAutoMatch) {
        await autoSyncMatches(supabase, enrichedPeople, currentMatches, currentDismissed);
        const { data: updatedMatchData, error: umErr } = await supabase
          .from('matches')
          .select('*')
          .order('paired_at', { ascending: false });
        if (!umErr && updatedMatchData) {
          setMatches(updatedMatchData.map(rowToMatch));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [useMock, sheetProfiles]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMock]);

  const syncFromSheets = useCallback(
    async () => {
      if (useMock) {
        const mockProfiles = new Map<string, SheetProfile>();
        MOCK_SHEET_PROFILES.forEach((p) => mockProfiles.set(p.email.toLowerCase(), p));
        setSheetProfiles(mockProfiles);
        setPeople(MOCK_PEOPLE.map((p) => enrichPerson(p, mockProfiles)));
        return MOCK_PEOPLE.length;
      }
      const profiles = await fetchAllSheetProfiles();
      setSheetProfiles(profiles);

      const supabase = getSupabase();
      let totalInserted = 0;
      let totalFixed = 0;
      for (const profile of profiles.values()) {
        const { data: existing } = await supabase
          .from('people')
          .select('id, gender')
          .eq('email', profile.email)
          .maybeSingle();

        if (existing) {
          const correctGender = toDbGender(profile.gender);
          if (existing.gender !== correctGender) {
            await supabase
              .from('people')
              .update({ gender: correctGender, updated_at: new Date().toISOString() })
              .eq('id', existing.id);
            totalFixed++;
          }
          continue;
        }

        const { error } = await supabase.from('people').insert({
          full_name: profile.full_name,
          email: profile.email,
          gender: toDbGender(profile.gender),
        });
        if (error) throw error;
        totalInserted++;
      }
      await refresh(profiles, true);
      return totalInserted + totalFixed;
    },
    [useMock, refresh],
  );

  const softDeletePerson = useCallback(
    async (id: string) => {
      if (useMock) {
        setPeople((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_deleted: true } : p)),
        );
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase
        .from('people')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [useMock, refresh],
  );

  const restorePerson = useCallback(
    async (id: string) => {
      if (useMock) {
        setPeople((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_deleted: false } : p)),
        );
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase
        .from('people')
        .update({ is_deleted: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [useMock, refresh],
  );

  const hardDeletePerson = useCallback(
    async (id: string) => {
      if (useMock) {
        setPeople((prev) => prev.filter((p) => p.id !== id));
        setMatches((prev) =>
          prev.filter((m) => m.person_1_id !== id && m.person_2_id !== id),
        );
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase.from('people').delete().eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [useMock, refresh],
  );

  const initiatePair = useCallback(
    async (aId: string, bId: string) => {
      if (useMock) {
        const newMatch: Match = {
          id: crypto.randomUUID(),
          person_1_id: aId,
          person_2_id: bId,
          paired_at: new Date().toISOString(),
          exchanged_contact: false,
          outcome: 'pending',
          outcome_set_at: null,
          notes: null,
        };
        setMatches((prev) => [newMatch, ...prev]);
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase.from('matches').insert({
        person_1_id: aId,
        person_2_id: bId,
        paired_at: new Date().toISOString(),
        exchanged_contact: false,
        outcome: 'pending',
      });
      if (e) throw e;
      await refresh();
    },
    [useMock, refresh],
  );

  const updateMatch = useCallback(
    async (id: string, patch: Partial<Match>) => {
      if (useMock) {
        setMatches((prev) =>
          prev.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        );
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase.from('matches').update(patch).eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [useMock, refresh],
  );

  const archivePair = useCallback(
    async (id: string, outcome: Exclude<Outcome, 'pending'>, notes: string) => {
      await updateMatch(id, {
        outcome,
        notes,
        outcome_set_at: new Date().toISOString(),
      });
    },
    [updateMatch],
  );

  const deleteMatch = useCallback(
    async (id: string) => {
      if (useMock) {
        setMatches((prev) => prev.filter((m) => m.id !== id));
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase.from('matches').delete().eq('id', id);
      if (e) throw e;
      await refresh();
    },
    [useMock, refresh],
  );

  const dismissPotentialMatch = useCallback((aId: string, bId: string, note: string) => {
    const [sortedA, sortedB] = [aId, bId].sort();
    if (useMock) {
      setDismissedPairs((prev) => {
        const pairKey = (x: string, y: string) => [x, y].sort().join('|');
        const key = pairKey(aId, bId);
        if (prev.some(([x, y]) => pairKey(x, y) === key)) return prev;
        return [...prev, [aId, bId, note] as [string, string, string]];
      });
      return;
    }
    const supabase = getSupabase();
    supabase
      .from('dismissed_pairs')
      .upsert({ person_a_id: sortedA, person_b_id: sortedB, note })
      .then(({ error }) => { if (error) console.error('Failed to persist dismissed pair:', error); });
    setDismissedPairs((prev) => {
      const pairKey = (x: string, y: string) => [x, y].sort().join('|');
      const key = pairKey(aId, bId);
      if (prev.some(([x, y]) => pairKey(x, y) === key)) return prev;
      return [...prev, [aId, bId, note] as [string, string, string]];
    });
  }, [useMock]);

  const undismissPair = useCallback((aId: string, bId: string) => {
    const [sortedA, sortedB] = [aId, bId].sort();
    if (useMock) {
      setDismissedPairs((prev) => {
        const pairKey = (x: string, y: string) => [x, y].sort().join('|');
        const key = pairKey(aId, bId);
        return prev.filter(([x, y]) => pairKey(x, y) !== key);
      });
      return;
    }
    const supabase = getSupabase();
    supabase
      .from('dismissed_pairs')
      .delete()
      .eq('person_a_id', sortedA)
      .eq('person_b_id', sortedB)
      .then(({ error }) => { if (error) console.error('Failed to remove dismissed pair:', error); });
    setDismissedPairs((prev) => {
      const pairKey = (x: string, y: string) => [x, y].sort().join('|');
      const key = pairKey(aId, bId);
      return prev.filter(([x, y]) => pairKey(x, y) !== key);
    });
  }, [useMock]);

  const seedSampleData = useCallback(async () => {
    if (useMock) return;
    const supabase = getSupabase();
    const profiles = new Map<string, SheetProfile>();
    MOCK_SHEET_PROFILES.forEach((p) => profiles.set(p.email.toLowerCase(), p));
    setSheetProfiles(profiles);

    const peopleRows = MOCK_PEOPLE.map((p) => ({
      full_name: p.full_name,
      email: p.email,
      gender: toDbGender(p.gender),
    }));
    const { data: insertedPeople, error: pErr } = await supabase
      .from('people')
      .insert(peopleRows)
      .select('id, email');
    if (pErr) throw pErr;

    const emailToId = new Map(
      (insertedPeople ?? []).map((r) => [String(r.email).toLowerCase(), String(r.id)]),
    );
    const mockIdToEmail = new Map(MOCK_PEOPLE.map((p) => [p.id, p.email.toLowerCase()]));

    const matchRows = MOCK_MATCHES.map((m) => {
      const email1 = mockIdToEmail.get(m.person_1_id);
      const email2 = mockIdToEmail.get(m.person_2_id);
      const pid1 = email1 ? emailToId.get(email1) : undefined;
      const pid2 = email2 ? emailToId.get(email2) : undefined;
      if (!pid1 || !pid2) return null;
      return {
        person_1_id: pid1,
        person_2_id: pid2,
        paired_at: m.paired_at,
        exchanged_contact: m.exchanged_contact,
        outcome: m.outcome,
        outcome_set_at: m.outcome_set_at,
        notes: m.notes,
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);

    if (matchRows.length > 0) {
      const { error: mErr } = await supabase.from('matches').insert(matchRows);
      if (mErr) throw mErr;
    }
    await refresh();
  }, [useMock, refresh]);

  const value = useMemo<DataContextValue>(
    () => ({
      people,
      matches,
      loading,
      error,
      useMock,
      dismissedPairs,
      sheetProfiles,
      refresh,
      syncFromSheets,
      softDeletePerson,
      restorePerson,
      hardDeletePerson,
      initiatePair,
      updateMatch,
      archivePair,
      deleteMatch,
      dismissPotentialMatch,
      undismissPair,
      seedSampleData,
    }),
    [
      people,
      matches,
      loading,
      error,
      useMock,
      dismissedPairs,
      sheetProfiles,
      refresh,
      syncFromSheets,
      softDeletePerson,
      restorePerson,
      hardDeletePerson,
      initiatePair,
      updateMatch,
      archivePair,
      deleteMatch,
      dismissPotentialMatch,
      undismissPair,
      seedSampleData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

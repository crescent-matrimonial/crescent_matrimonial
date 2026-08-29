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
import { MOCK_MATCHES, MOCK_PEOPLE } from './mockData';
import type { Match, Outcome, Person } from './types';

interface DataContextValue {
  people: Person[];
  matches: Match[];
  loading: boolean;
  error: string | null;
  useMock: boolean;
  /** Dismissed potential pairs (client-side blacklist for the matching engine). */
  dismissedPairs: Array<[string, string]>;
  refresh: () => Promise<void>;
  upsertPeople: (people: Person[]) => Promise<void>;
  softDeletePerson: (id: string) => Promise<void>;
  hardDeletePerson: (id: string) => Promise<void>;
  updatePerson: (id: string, patch: Partial<Person>) => Promise<void>;
  initiatePair: (aId: string, bId: string) => Promise<void>;
  updateMatch: (id: string, patch: Partial<Match>) => Promise<void>;
  archivePair: (id: string, outcome: Exclude<Outcome, 'pending'>, notes: string) => Promise<void>;
  dismissPotentialMatch: (aId: string, bId: string) => void;
  seedSampleData: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

const DISMISSED_KEY = 'crescent_dismissed_pairs';

function loadDismissed(): Array<[string, string]> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[][];
    return parsed.map((p) => [p[0], p[1]]);
  } catch {
    return [];
  }
}

function saveDismissed(pairs: Array<[string, string]>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(pairs));
}

function rowToPerson(row: Record<string, unknown>): Person {
  return {
    id: String(row.id),
    first_name: (row.first_name as string) ?? null,
    last_name: (row.last_name as string) ?? null,
    full_name: (row.full_name as string) ?? null,
    email: (row.email as string) ?? null,
    gender: (row.gender as Person['gender']) ?? null,
    profile_photo_url: (row.profile_photo_url as string) ?? null,
    age: (row.age as number) ?? null,
    location: (row.location as string) ?? null,
    occupation: (row.occupation as string) ?? null,
    about_you: (row.about_you as Person['about_you']) ?? {},
    looking_for: (row.looking_for as Person['looking_for']) ?? {},
    preferences: (row.preferences as Person['preferences']) ?? {},
    admin_notes: (row.admin_notes as string) ?? null,
    source_sheet: (row.source_sheet as Person['source_sheet']) ?? null,
    sheet_key: (row.sheet_key as string) ?? null,
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [dismissedPairs, setDismissedPairs] = useState<Array<[string, string]>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const useMock = !hasConfiguredKey();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (useMock) {
      setPeople(MOCK_PEOPLE);
      setMatches(MOCK_MATCHES);
      setDismissedPairs(loadDismissed());
      setLoading(false);
      return;
    }
    try {
      const supabase = getSupabase();
      const [{ data: peopleData, error: pErr }, { data: matchData, error: mErr }] =
        await Promise.all([
          supabase.from('people').select('*').order('created_at', { ascending: false }),
          supabase.from('matches').select('*').order('paired_at', { ascending: false }),
        ]);
      if (pErr) throw pErr;
      if (mErr) throw mErr;
      setPeople((peopleData ?? []).map(rowToPerson));
      setMatches((matchData ?? []).map(rowToMatch));
      setDismissedPairs(loadDismissed());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [useMock]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertPeople = useCallback(
    async (incoming: Person[]) => {
      if (useMock) {
        // Merge by sheet_key in mock mode.
        setPeople((prev) => {
          const byKey = new Map(prev.map((p) => [p.sheet_key ?? p.email ?? p.id, p]));
          for (const np of incoming) {
            const key = np.sheet_key ?? np.email ?? '';
            const existing = byKey.get(key);
            if (existing) {
              byKey.set(key, {
                ...existing,
                ...np,
                id: existing.id,
                is_deleted: existing.is_deleted,
                admin_notes: existing.admin_notes,
                created_at: existing.created_at,
              });
            } else {
              byKey.set(key, { ...np, id: np.id || crypto.randomUUID() });
            }
          }
          return Array.from(byKey.values());
        });
        return;
      }
      const supabase = getSupabase();
      const rows = incoming.map((p) => ({
        id: p.id || undefined,
        first_name: p.first_name,
        last_name: p.last_name,
        full_name: p.full_name,
        email: p.email,
        gender: p.gender,
        profile_photo_url: p.profile_photo_url,
        age: p.age,
        location: p.location,
        occupation: p.occupation,
        about_you: p.about_you,
        looking_for: p.looking_for,
        preferences: p.preferences,
        source_sheet: p.source_sheet,
        sheet_key: p.sheet_key,
      }));
      const { error: e } = await supabase
        .from('people')
        .upsert(rows, { onConflict: 'sheet_key' });
      if (e) throw e;
      await refresh();
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

  const updatePerson = useCallback(
    async (id: string, patch: Partial<Person>) => {
      if (useMock) {
        setPeople((prev) =>
          prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        );
        return;
      }
      const supabase = getSupabase();
      const { error: e } = await supabase
        .from('people')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', id);
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

  const dismissPotentialMatch = useCallback((aId: string, bId: string) => {
    setDismissedPairs((prev) => {
      const next = [...prev, [aId, bId] as [string, string]];
      saveDismissed(next);
      return next;
    });
  }, []);

  const seedSampleData = useCallback(async () => {
    if (useMock) return;
    const supabase = getSupabase();
    // Insert people (strip the mock IDs so the DB generates real ones), then
    // re-fetch to get the new IDs so we can map mock match IDs -> real IDs.
    const peopleRows = MOCK_PEOPLE.map((p) => ({
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.full_name,
      email: p.email,
      gender: p.gender,
      profile_photo_url: p.profile_photo_url,
      age: p.age,
      location: p.location,
      occupation: p.occupation,
      about_you: p.about_you,
      looking_for: p.looking_for,
      preferences: p.preferences,
      source_sheet: p.source_sheet,
      sheet_key: p.sheet_key,
    }));
    const { data: insertedPeople, error: pErr } = await supabase
      .from('people')
      .upsert(peopleRows, { onConflict: 'sheet_key' })
      .select('id, sheet_key');
    if (pErr) throw pErr;
    const keyToId = new Map(
      (insertedPeople ?? []).map((r) => [String(r.sheet_key), String(r.id)]),
    );
    const mockIdToKey = new Map(MOCK_PEOPLE.map((p) => [p.id, p.sheet_key]));

    const matchRows = MOCK_MATCHES.map((m) => {
      const key1 = mockIdToKey.get(m.person_1_id);
      const key2 = mockIdToKey.get(m.person_2_id);
      const pid1 = key1 ? keyToId.get(key1) : undefined;
      const pid2 = key2 ? keyToId.get(key2) : undefined;
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
      refresh,
      upsertPeople,
      softDeletePerson,
      hardDeletePerson,
      updatePerson,
      initiatePair,
      updateMatch,
      archivePair,
      dismissPotentialMatch,
      seedSampleData,
    }),
    [
      people,
      matches,
      loading,
      error,
      useMock,
      dismissedPairs,
      refresh,
      upsertPeople,
      softDeletePerson,
      hardDeletePerson,
      updatePerson,
      initiatePair,
      updateMatch,
      archivePair,
      dismissPotentialMatch,
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

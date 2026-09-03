/**
 * Gender values used throughout the app.
 *
 * The database stores 'Man' / 'Woman' (matching the check constraint on the
 * `people` table). Internally we normalize to 'male' / 'female' for UI logic,
 * and convert at the database boundary.
 */
export type Gender = 'male' | 'female';

/** DB-side gender strings that satisfy the `people_gender_check` constraint. */
export type DbGender = 'Man' | 'Woman';

export function toDbGender(g: Gender): DbGender {
  return g === 'male' ? 'Man' : 'Woman';
}

export function fromDbGender(g: string | null): Gender | null {
  if (!g) return null;
  const lower = g.toLowerCase();
  if (lower === 'man' || lower === 'male') return 'male';
  if (lower === 'woman' || lower === 'female') return 'female';
  return null;
}

export type Outcome = 'pending' | 'worked_out' | 'failed' | 'manually_removed';

/** A single mapped question stored on a candidate. */
export interface QuestionField {
  key: string;
  question: string;
  answer: string;
  values: string[];
  multi: boolean;
  section: 'about' | 'looking';
}

/**
 * A person as stored in the database.
 * Only `id`, `full_name`, `email`, `gender` are persisted.
 * All profile details come from Google Sheets and are merged in-memory.
 */
export interface Person {
  id: string;
  full_name: string;
  email: string;
  gender: Gender;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * A person enriched with sheet-sourced profile data.
 * The sheet details are fetched on demand and merged by email.
 */
export interface PersonWithDetails extends Person {
  age: number | null;
  location: string | null;
  occupation: string | null;
  profile_photo_url: string | null;
  photo_urls: string[];
  admin_note: string | null;
  bio_data_url: string | null;
  about_you: Record<string, QuestionField>;
  looking_for: Record<string, QuestionField>;
}

export interface Match {
  id: string;
  person_1_id: string;
  person_2_id: string;
  paired_at: string;
  exchanged_contact: boolean;
  outcome: Outcome;
  outcome_set_at: string | null;
  notes: string | null;
}

export interface MatchWithPeople extends Match {
  person_1: Person | null;
  person_2: Person | null;
}

export interface CompatibilityResult {
  personA: PersonWithDetails;
  personB: PersonWithDetails;
  score: number;
  total: number;
  passed: number;
  rows: CompatibilityRow[];
  /** Only rows where both directions matched — for the details view. */
  matchedRows: CompatibilityRow[];
}

export interface CompatibilityRow {
  key: string;
  questionA: string;
  questionB: string;
  answerA: string[];
  criteriaB: string[];
  aMatchesB: boolean;
  answerB: string[];
  criteriaA: string[];
  bMatchesA: boolean;
  multi: boolean;
}

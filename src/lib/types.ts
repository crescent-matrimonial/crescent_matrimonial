export type Gender = 'male' | 'female';

export type Outcome = 'pending' | 'worked_out' | 'failed' | 'manually_removed';

/** A single mapped question stored on a candidate. */
export interface QuestionField {
  /** Stable key derived from the question header (slugified). */
  key: string;
  /** Original question text from the sheet header. */
  question: string;
  /** Raw string answer. */
  answer: string;
  /** Normalized answer as a list (split on commas for multi-select). */
  values: string[];
  /** Whether this question was a multi-select ("Select all that apply"). */
  multi: boolean;
  /** Which section this field belongs to. */
  section: 'about' | 'looking';
}

export interface Person {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  email: string | null;
  gender: Gender | null;
  profile_photo_url: string | null;
  age: number | null;
  location: string | null;
  occupation: string | null;
  about_you: Record<string, QuestionField>;
  looking_for: Record<string, QuestionField>;
  preferences: Record<string, unknown>;
  admin_notes: string | null;
  source_sheet: 'men' | 'women' | null;
  sheet_key: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
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

/** A computed cross-section compatibility result between two candidates. */
export interface CompatibilityResult {
  personA: Person;
  personB: Person;
  /** Bi-directional percentage score. */
  score: number;
  /** Total mapped criteria considered. */
  total: number;
  /** Criteria that passed both directions. */
  passed: number;
  /** Per-criterion breakdown rows for the comparison table. */
  rows: CompatibilityRow[];
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

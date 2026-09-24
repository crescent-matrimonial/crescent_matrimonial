/*
# Create people and matches tables for Matchmaking Dashboard

1. New Tables
- `public.people`: Stores candidate profile data synced from Google Sheets.
  - id (uuid, primary key, default gen_random_uuid())
  - first_name (text)
  - last_name (text)
  - full_name (text) — convenience display field
  - email (text)
  - gender (text) — 'male' or 'female'
  - profile_photo_url (text) — optional URL
  - age (integer, nullable)
  - location (text, nullable)
  - occupation (text, nullable)
  - about_you (jsonb) — parsed "About You" responses keyed by question
  - looking_for (jsonb) — parsed "What You're Looking For" responses keyed by question
  - preferences (jsonb) — custom response preferences / extra fields
  - admin_notes (text) — admin-maintained notes
  - source_sheet (text) — 'men' or 'women'
  - sheet_key (text) — composite key First+Last+Email for upsert dedupe
  - is_deleted (boolean, default false) — soft delete flag
  - created_at (timestamptz, default now())
  - updated_at (timestamptz, default now())
- `public.matches`: Stores dynamic pairing data.
  - id (uuid, primary key)
  - person_1_id (uuid, FK -> people.id ON DELETE CASCADE)
  - person_2_id (uuid, FK -> people.id ON DELETE CASCADE)
  - paired_at (timestamptz, default now())
  - exchanged_contact (boolean, default false)
  - outcome (text, check in pending/worked_out/failed/manually_removed, default pending)
  - outcome_set_at (timestamptz, nullable)
  - notes (text, nullable)

2. Security
- Enable RLS on both tables.
- This app uses Google OAuth sign-in with a strict admin email whitelist enforced
  in the frontend. All data is intentionally shared among authenticated admins
  (no per-user ownership), so policies are scoped TO authenticated with USING (true).
- 4 CRUD policies per table (select/insert/update/delete).

3. Indexes
- people(email), people(gender), people(is_deleted), people(sheet_key)
- matches(person_1_id), matches(person_2_id), matches(outcome)
*/

CREATE TABLE IF NOT EXISTS public.people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  full_name text,
  email text,
  gender text CHECK (gender IN ('male','female')),
  profile_photo_url text,
  age integer,
  location text,
  occupation text,
  about_you jsonb DEFAULT '{}'::jsonb,
  looking_for jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  admin_notes text,
  source_sheet text,
  sheet_key text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_people" ON public.people;
CREATE POLICY "select_people" ON public.people FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_people" ON public.people;
CREATE POLICY "insert_people" ON public.people FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_people" ON public.people;
CREATE POLICY "update_people" ON public.people FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_people" ON public.people;
CREATE POLICY "delete_people" ON public.people FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS people_email_idx ON public.people(email);
CREATE INDEX IF NOT EXISTS people_gender_idx ON public.people(gender);
CREATE INDEX IF NOT EXISTS people_is_deleted_idx ON public.people(is_deleted);
CREATE INDEX IF NOT EXISTS people_sheet_key_idx ON public.people(sheet_key);

CREATE TABLE IF NOT EXISTS public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_1_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  person_2_id uuid REFERENCES public.people(id) ON DELETE CASCADE,
  paired_at timestamptz NOT NULL DEFAULT now(),
  exchanged_contact boolean NOT NULL DEFAULT false,
  outcome text NOT NULL DEFAULT 'pending' CHECK (outcome IN ('pending','worked_out','failed','manually_removed')),
  outcome_set_at timestamptz,
  notes text
);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_matches" ON public.matches;
CREATE POLICY "select_matches" ON public.matches FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_matches" ON public.matches;
CREATE POLICY "insert_matches" ON public.matches FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_matches" ON public.matches;
CREATE POLICY "update_matches" ON public.matches FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_matches" ON public.matches;
CREATE POLICY "delete_matches" ON public.matches FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS matches_person_1_idx ON public.matches(person_1_id);
CREATE INDEX IF NOT EXISTS matches_person_2_idx ON public.matches(person_2_id);
CREATE INDEX IF NOT EXISTS matches_outcome_idx ON public.matches(outcome);


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


CREATE TABLE IF NOT EXISTS public.dismissed_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_a_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  person_b_id uuid NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  note text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (person_a_id, person_b_id)
);

ALTER TABLE public.dismissed_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_dismissed_pairs" ON public.dismissed_pairs;
CREATE POLICY "select_dismissed_pairs" ON public.dismissed_pairs FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_dismissed_pairs" ON public.dismissed_pairs;
CREATE POLICY "insert_dismissed_pairs" ON public.dismissed_pairs FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "delete_dismissed_pairs" ON public.dismissed_pairs;
CREATE POLICY "delete_dismissed_pairs" ON public.dismissed_pairs FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS dismissed_pairs_a_idx ON public.dismissed_pairs(person_a_id);
CREATE INDEX IF NOT EXISTS dismissed_pairs_b_idx ON public.dismissed_pairs(person_b_id);

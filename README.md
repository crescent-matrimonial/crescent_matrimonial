# crescent_matrimonial

[![Open in Bolt](https://bolt.new/static/open-in-bolt.svg)](https://bolt.new/~/sb1-ug3rhcut)

## Required database access rules (apply on the Supabase project this app uses)

This dashboard talks to the Supabase project `saefetnlvblsrbtvyorg`, which is managed
outside this workspace. The row-level policies on that project currently allow **any**
signed-in account full read/write/delete on the candidate, pairing and dismissed-pair
tables. Because Google sign-in is open to any Google account, anyone can obtain a valid
token and call the data API directly, bypassing the dashboard entirely.

Run the following in that project's SQL editor to restrict every table to the admin
account. Also restrict the Google provider to that single account in
Authentication → Providers.

```sql
-- people
DROP POLICY IF EXISTS "select_people" ON public.people;
CREATE POLICY "select_people" ON public.people FOR SELECT
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "insert_people" ON public.people;
CREATE POLICY "insert_people" ON public.people FOR INSERT
  TO authenticated WITH CHECK (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "update_people" ON public.people;
CREATE POLICY "update_people" ON public.people FOR UPDATE
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "delete_people" ON public.people;
CREATE POLICY "delete_people" ON public.people FOR DELETE
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

-- matches
DROP POLICY IF EXISTS "select_matches" ON public.matches;
CREATE POLICY "select_matches" ON public.matches FOR SELECT
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "insert_matches" ON public.matches;
CREATE POLICY "insert_matches" ON public.matches FOR INSERT
  TO authenticated WITH CHECK (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "update_matches" ON public.matches;
CREATE POLICY "update_matches" ON public.matches FOR UPDATE
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "delete_matches" ON public.matches;
CREATE POLICY "delete_matches" ON public.matches FOR DELETE
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

-- dismissed_pairs
DROP POLICY IF EXISTS "select_dismissed_pairs" ON public.dismissed_pairs;
CREATE POLICY "select_dismissed_pairs" ON public.dismissed_pairs FOR SELECT
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "insert_dismissed_pairs" ON public.dismissed_pairs;
CREATE POLICY "insert_dismissed_pairs" ON public.dismissed_pairs FOR INSERT
  TO authenticated WITH CHECK (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');

DROP POLICY IF EXISTS "delete_dismissed_pairs" ON public.dismissed_pairs;
CREATE POLICY "delete_dismissed_pairs" ON public.dismissed_pairs FOR DELETE
  TO authenticated USING (auth.jwt() ->> 'email' = 'crescentmatrimonial@gmail.com');
```

The `send-pair-email` function must also be redeployed on that project from
`supabase/functions/send-pair-email/index.ts` with JWT verification switched **on**,
so that only the admin account can send mail through it.

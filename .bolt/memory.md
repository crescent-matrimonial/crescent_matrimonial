# Project memory

## Product intent & audience

- Candidate compatibility/matching app that compares two candidates across multiple rules.
- Rules are scored and displayed with pass/fail visual states (green = pass).
- Each rule row shows both candidates' actual answers side-by-side.

## Brand personality & voice

- Production-quality, polished UI; avoid generic/cookie-cutter layouts (per global instructions in `.bolt/prompt`).

## Visual design & UX direction

- Rule results use color-coded status (green for pass).
- Comparison rows display candidate answers in a side-by-side layout.
- UI built with React + Tailwind CSS + lucide-react icons; JSX syntax, `@/` import alias (see `.bolt/prompt`).

## Decisions, constraints & rationale

- **Ethnicity compatibility rule forced to always pass:** The "Country of Ethnicity" rule is intentionally hardcoded to always show green regardless of candidate answers.
  - Rationale: User explicitly requested this rule always pass; real answers are still displayed in the row for transparency.
- Placeholder/test text in rule rows should be replaced with actual candidate data.

## Open questions & assumptions

- Whether other rules follow normal pass/fail logic or if any additional rules should also be forced to pass.
- Full scope of the compatibility rule set beyond ethnicity is not yet confirmed.
import type { CompatibilityResult, CompatibilityRow, Match, PersonWithDetails, QuestionField } from './types';

/**
 * Matrimonial Matchmaking Engine — Bidirectional Exact-Mapping Model
 *
 * Two candidates are a FULL MATCH only when EVERY rule passes in both directions.
 * Each rule produces two directional checks (A→B and B→A) unless noted otherwise.
 */

// ──────────────────────────────────────────────
//  Generic helpers
// ──────────────────────────────────────────────

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Normalize unicode curly quotes/apostrophes to straight ASCII equivalents. */
function normalizeStr(s: string): string {
  return s
    .replace(/[\u2018\u2019\u02BC\u05F3]/g, "'")
    .replace(/[\u201C\u201D\u02BA\u05F4]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

function normList(values: string[]): string[] {
  return values
    .map((v) => normalizeStr(v.trim().toLowerCase()))
    .filter(Boolean);
}

/** Find a field by regex matching against the question header (case-insensitive). */
function getField(profile: PersonWithDetails, section: 'about' | 'looking', keyPattern: RegExp): QuestionField | undefined {
  const dict = section === 'about' ? profile.about_you : profile.looking_for;
  return Object.values(dict).find((f) => keyPattern.test(f.question.toLowerCase()));
}

function getValues(profile: PersonWithDetails, section: 'about' | 'looking', keyPattern: RegExp): string[] {
  const field = getField(profile, section, keyPattern);
  return field ? normList(field.values) : [];
}

function hasOverlap(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  return a.some((v) => b.includes(v));
}

/**
 * Map raw option strings to canonical keys using a lookup table.
 * Each entry: [canonicalKey, [list of substrings that map to it]].
 */
function canonicalize(raw: string[], mappings: Array<[string, string[]]>): Set<string> {
  const result = new Set<string>();
  for (const val of raw) {
    const v = normalizeStr(val.toLowerCase());
    for (const [key, patterns] of mappings) {
      if (patterns.some((p) => v.includes(p))) {
        result.add(key);
      }
    }
  }
  return result;
}

function hasCanonicalOverlap(
  aRaw: string[],
  bRaw: string[],
  mappings: Array<[string, string[]]>,
): boolean {
  const aSet = canonicalize(aRaw, mappings);
  const bSet = canonicalize(bRaw, mappings);
  if (aSet.size === 0 || bSet.size === 0) return false;
  for (const key of aSet) {
    if (bSet.has(key)) return true;
  }
  return false;
}

// ──────────────────────────────────────────────
//  Rule 1: Age
// ──────────────────────────────────────────────

function parseAgeFromField(profile: PersonWithDetails): number | null {
  if (profile.age != null) return profile.age;
  const birthField = getField(profile, 'about', /birth\s*date|date\s*of\s*birth|dob/i);
  if (birthField) {
    const dateStr = normalizeStr(birthField.answer.trim());
    // Try M/D/YYYY format (Google Forms default)
    const mdMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdMatch) {
      const d = new Date(parseInt(mdMatch[3]), parseInt(mdMatch[1]) - 1, parseInt(mdMatch[2]));
      if (!isNaN(d.getTime())) {
        const diff = Date.now() - d.getTime();
        return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
      }
    }
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const diff = Date.now() - parsed.getTime();
      return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    }
  }
  const ageField = getField(profile, 'about', /^age$/i);
  if (ageField) {
    const numMatch = ageField.answer.match(/\d+/);
    if (numMatch) return parseInt(numMatch[0], 10);
  }
  return null;
}

/** Extract age range from "How Many Years Younger/Older" preference fields. */
function getAgeRangeFromPreferences(profile: PersonWithDetails): { min: number; max: number } | null {
  const myAge = parseAgeFromField(profile);
  if (myAge == null) return null;

  const youngerField = getField(profile, 'looking', /years.*younger|how.*many.*year.*younger/i);
  const olderField = getField(profile, 'looking', /years.*older|how.*many.*year.*older/i);
  let younger = 5;
  let older = 5;
  if (youngerField) {
    const m = youngerField.answer.match(/\d+/);
    if (m) younger = parseInt(m[0], 10);
  }
  if (olderField) {
    const m = olderField.answer.match(/\d+/);
    if (m) older = parseInt(m[0], 10);
  }
  return { min: myAge - younger, max: myAge + older };
}

// ──────────────────────────────────────────────
//  Rule 2: Height
// ──────────────────────────────────────────────

function parseHeightInches(value: string): number | null {
  const v = normalizeStr(value.trim().toLowerCase());
  if (!v) return null;
  // 5'9" or 5'9" after normalization
  const ftInMatch = v.match(/(\d+)\s*['']\s*(\d+)\s*[""]/);
  if (ftInMatch) return parseInt(ftInMatch[1], 10) * 12 + parseInt(ftInMatch[2], 10);
  const ftInWord = v.match(/(\d+)\s*(?:ft|feet)\s*(\d+)\s*(?:in|inch)/);
  if (ftInWord) return parseInt(ftInWord[1], 10) * 12 + parseInt(ftInWord[2], 10);
  const cmMatch = v.match(/(\d+)\s*cm/);
  if (cmMatch) return Math.round(parseInt(cmMatch[1], 10) / 2.54);
  const numMatch = v.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1]);
    if (num > 40) return Math.round(num);
    return Math.round(num / 2.54);
  }
  return null;
}

/** Get height range from "Wife's/Husband's Shortest/Tallest Height" fields. */
function getHeightRange(profile: PersonWithDetails): { min: number; max: number } | null {
  const shortestField = getField(profile, 'looking', /shortest.*height|wife.*shortest|husband.*shortest/i);
  const tallestField = getField(profile, 'looking', /tallest.*height|wife.*tallest|husband.*tallest/i);
  if (shortestField && tallestField) {
    const min = parseHeightInches(shortestField.answer);
    const max = parseHeightInches(tallestField.answer);
    if (min != null && max != null) return { min: Math.min(min, max), max: Math.max(min, max) };
  }
  // Try combined range field
  const rangeField = getField(profile, 'looking', /height.*range|partner.*height/i);
  if (rangeField) {
    const v = rangeField.answer.trim();
    const parts = v.split(/(?:-|to|–|—)/).map((s) => s.trim());
    if (parts.length === 2) {
      const min = parseHeightInches(parts[0]);
      const max = parseHeightInches(parts[1]);
      if (min != null && max != null) return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }
  return null;
}

function getCandidateHeight(profile: PersonWithDetails): number | null {
  const heightField = getField(profile, 'about', /^height$|your.*height/i);
  if (heightField) return parseHeightInches(heightField.answer);
  return null;
}

// ──────────────────────────────────────────────
//  Rule 3: Past Marital Status
// ──────────────────────────────────────────────

const MARITAL_MAPPINGS: Array<[string, string[]]> = [
  ['never_no_kids', ['never married and have no kids', 'never married and has no kids']],
  ['married_no_kids', ['married in the past but have no kids', 'married in the past but has no kids']],
  ['married_has_kids', ['married in the past and have kids', 'married in the past and has kids']],
];

// ──────────────────────────────────────────────
//  Rule 4: Employment & Post-Marriage Employment
// ──────────────────────────────────────────────

/**
 * Brother "About You" employment status (current job) matched against
 * Sister "Seeking in a Husband" employment status.
 * Also used symmetrically for sister about → brother seeking (employment status).
 */
const EMPLOYMENT_STATUS_MAPPINGS: Array<[string, string[]]> = [
  ['working_full_time', ['working full time', 'working full-time']],
  ['working_part_time', ['working part time', 'working part-time']],
  ['unemployed_looking', ['unemployed but looking', 'currently unemployed']],
  ['student_bachelors', ['student doing bachelors']],
  ['student_masters', ['student doing masters', 'masters/doctorate', 'masters / doctorate']],
];

/**
 * Sister "About You" post-marriage employment plans matched against
 * Brother "Seeking in a Wife" post-marriage employment.
 */
const POST_MARRIAGE_EMPLOYMENT_MAPPINGS: Array<[string, string[]]> = [
  ['does_not_plan_to_work', ["don't plan to work", 'does not plan to work', 'do not plan to work']],
  ['always_full_time', ['always plan to work full-time', 'always plan to work full time', 'always plans to work full-time', 'always plans to work full time']],
  ['always_part_time', ['always plan to work part-time', 'always plan to work part time', 'always plans to work part-time', 'always plans to work part time']],
  ['full_then_part_after_kids', ['work full-time and then part-time after kids', 'work full time and then part time after kids', 'plans to work full-time and then part-time after kids']],
  ['work_until_kids_stop', ['work until kids then i will stop', 'work until kids and then will stop', 'plans to work until kids and then will stop working', 'plans to work until kids and then will stop']],
  ['work_until_kids_pause', ['work until kids and then will pause', 'work until kids then i will pause', 'plans to work until kids and then will pause until they are older']],
];

// ──────────────────────────────────────────────
//  Rule 5: Prayer Habits
// ──────────────────────────────────────────────

const PRAYER_MAPPINGS: Array<[string, string[]]> = [
  ['prays_5', ['pray 5 times a day', 'prays 5 times a day']],
  ['trying_best', ['trying my best to pray 5 times daily but occasionally miss', 'trying his best to pray 5 times daily but occasionally misses', 'trying her best to pray 5 times daily but occasionally misses', 'trying best to pray 5 times daily']],
  ['some_prayers', ['pray some prayers daily but not usually all 5', 'prays some prayers daily but not usually all 5']],
  ['some_days', ["don't pray every day but i try to some days", "doesn't pray every day but tries to some days", "dont pray every day but i try to some days", "don't pray every day but tries to some days", 'not every day but try to some days']],
  ['not_much', ["don't pray that much", "doesn't pray that much", 'dont pray that much']],
];

// ──────────────────────────────────────────────
//  Rule 6: Hijab
// ──────────────────────────────────────────────

const HIJAB_MAPPINGS: Array<[string, string[]]> = [
  ['wears_hijab', ['wear a hijab', 'wears a hijab']],
  ['wears_niqab', ['wear a niqab', 'wears a niqab']],
  ['no_hijab', ["don't wear a hijab", "doesn't wear a hijab", 'dont wear a hijab', 'doesnt wear a hijab']],
  ['working_towards', ["don't wear a hijab but am working towards it", "doesn't wear a hijab but is working towards it", "don't wear a hijab but is working towards it"]],
];

// ──────────────────────────────────────────────
//  Rule 7: Islamic Atmosphere
// ──────────────────────────────────────────────

const ATMOSPHERE_MAPPINGS: Array<[string, string[]]> = [
  ['events_sometimes', [
    'attend islamic events/classes and listen to lectures sometimes',
    'attends islamic events/classes and listen to lectures sometimes',
    'attend islamic events and listen to lectures sometimes',
    'attends islamic events and listen to lectures sometimes',
  ]],
  ['studying_deen', ['studying deen full-time', 'studying deen full time']],
  ['classes_weekly', ['attend islamic classes a once or few times a week', 'attends islamic classes a once or few times a week']],
  ['not_planning', ["not planning to attend any classes/events", "isn't planning to attend"]],
  ['dont_attend', [
    "don't attend any islamic events or listen to lectures",
    "doesn't attend any islamic events or listen to lectures",
    "dont attend any islamic events or listen to lectures",
  ]],
  ['wish_to', [
    "doesn't attend any islamic events or listen to lectures but she does wish to",
    "doesn't attend any islamic events or listen to lectures but he does wish to",
    "but she does wish to",
    "but he does wish to",
  ]],
  ['online_lectures', [
    "frequently listen to islamic lectures online but don't go in person",
    "frequently listens to islamic lectures online but doesn't go in person",
    "frequently listen to islamic lectures online but dont attend",
    "frequently listens to islamic lectures online but doesnt attend",
  ]],
  ['volunteer_masjid', [
    'volunteer/work at a masjid or islamic organization',
    'volunteers/works at a masjid or islamic organization',
  ]],
];

// ──────────────────────────────────────────────
//  Rule 8: Halal Food
// ──────────────────────────────────────────────

const HALAL_MAPPINGS: Array<[string, string[]]> = [
  ['halal_label', ['require a halal label or need to be told it is halal', 'requires a halal label or needs to be told it is halal']],
  ['hand_slaughtered', ['need to at least be told that the meat is hand-slaughtered', 'needs to at least be told that the meat is hand-slaughtered']],
  ['certified_zabiha', ['certified zabiha by a trusted group', 'requires food to be certified zabiha by a trusted group']],
  ['any_meat', ['fine with eating any meat other than pork', 'is fine with eating any meat other than pork']],
];

// ──────────────────────────────────────────────
//  Rule 9: Islamic Affiliation
// ──────────────────────────────────────────────

const AFFILIATION_MAPPINGS: Array<[string, string[]]> = [
  ['hanafi', ['hanafi']],
  ['maliki', ['maliki']],
  ['shafi', ['shafi']],
  ['hanbali', ['hanbali']],
  ['no_madhab', ['no particular madhab']],
  ['salafi', ['salafi']],
  ['deobandi', ['deobandi']],
  ['shia', ['shia']],
  ['no_affiliation', ['no affiliations', 'no affiliation']],
];

// ──────────────────────────────────────────────
//  Rule 10: Location & Relocation
// ──────────────────────────────────────────────

function getState(profile: PersonWithDetails, section: 'about' | 'looking'): string | null {
  const field = getField(profile, section, /state.*reside|state.*live|state you reside/i);
  if (!field) return null;
  const v = field.answer.trim().toLowerCase();
  return v || null;
}

function getWillingToRelocate(profile: PersonWithDetails): boolean {
  const field = getField(profile, 'about', /relocat|willingness to relocate/i);
  if (!field) return false;
  return /yes|willing|open/i.test(field.answer);
}

// ──────────────────────────────────────────────
//  Rule 11: Ethnicity
// ──────────────────────────────────────────────

function getEthnicity(profile: PersonWithDetails, section: 'about' | 'looking'): string[] {
  // "Country of Ethnicity" in about; "Wife's/Husband's Country of Ethnicity" in looking
  const primary = getField(profile, section, /country.*ethnicity|ethnicity/i);
  const secondary = getField(profile, section, /secondary.*country.*ethnicity|secondary.*ethnicity/i);
  const result: string[] = [];
  if (primary) result.push(...normList(primary.values.length > 0 ? primary.values : [primary.answer]));
  if (secondary) result.push(...normList(secondary.values.length > 0 ? secondary.values : [secondary.answer]));
  return result;
}

function getEthnicityPreference(profile: PersonWithDetails): 'must' | 'any' | 'prefer' | null {
  // The preference is in the "looking" section's "Wife's/Husband's Country of Ethnicity" field
  const field = getField(profile, 'looking', /country.*ethnicity/i);
  if (!field) return null;
  const v = normalizeStr(field.answer.toLowerCase());
  if (/must.*my.*country|must.*from.*my/i.test(v)) return 'must';
  if (/any.*country.*ethnicity|okay.*any/i.test(v)) {
    if (/prefer/i.test(v)) return 'prefer';
    return 'any';
  }
  // If the answer contains actual country names, treat as 'any'
  return 'any';
}

function checkEthnicityDirection(
  seeker: PersonWithDetails,
  target: PersonWithDetails,
): boolean {
  const pref = getEthnicityPreference(seeker);
  if (pref === 'any' || pref === 'prefer') return true;
  if (pref === 'must') {
    const seekerEth = getEthnicity(seeker, 'about');
    const targetEth = getEthnicity(target, 'about');
    if (seekerEth.length === 0 || targetEth.length === 0) return true;
    return hasOverlap(seekerEth, targetEth);
  }
  return true;
}

// ──────────────────────────────────────────────
//  Rule 12: Symmetric (about ↔ about)
// ──────────────────────────────────────────────

const LIVING_SITUATION_MAPPINGS: Array<[string, string[]]> = [
  ['separate_from_parents', ['live separately from parents']],
  ['separate_then_parents_move_in', [
    'live separately initially and then my parents will move in',
    "live separately initially and then my husband's parents will move in",
    'separately initially and then my parents will move in',
  ]],
  ['with_parents_then_move_out', [
    'live with my parents initially and then move out',
    "live with my husband's parents initially and then move out",
  ]],
  ['live_with_parents', ['live with my parents', "live with my husband's parents"]],
  ['live_with_wife_parents', ["live with my wife's parents"]],
];

const FINANCIAL_ROLES_MAPPINGS: Array<[string, string[]]> = [
  ['equal_share', ['both equally share housework and financial responsibilities']],
  ['husband_provider', [
    'husband provides all finances and wife will take care of home',
    'husband provides all finances and wife will take care of the home',
  ]],
  ['both_share_wife_works', [
    'both share financial and home responsibilities while wife works',
    'both share financial and home responsibilities while still primarily',
  ]],
  ['wife_contributes_working', ['wife contributes financially only while she is working']],
];

// ──────────────────────────────────────────────
//  Row builder
// ──────────────────────────────────────────────

function makeRow(
  key: string,
  questionA: string,
  answerA: string[],
  questionB: string,
  answerB: string[],
  criteriaA: string[],
  criteriaB: string[],
  aMatchesB: boolean,
  bMatchesA: boolean,
  multi: boolean,
): CompatibilityRow {
  return {
    key,
    questionA,
    questionB,
    answerA,
    criteriaB,
    aMatchesB,
    answerB,
    criteriaA,
    bMatchesA,
    multi,
  };
}

// ──────────────────────────────────────────────
//  Main: computeCompatibility
// ──────────────────────────────────────────────

export function computeCompatibility(a: PersonWithDetails, b: PersonWithDetails): CompatibilityResult {
  const rows: CompatibilityRow[] = [];
  let passed = 0;
  let total = 0;

  const brother = a.gender === 'male' ? a : b;
  const sister = a.gender === 'female' ? a : b;
  const aIsBrother = a.gender === 'male';

  // ── Rule 1: Age Range ──
  total++;
  const ageA = parseAgeFromField(a);
  const ageB = parseAgeFromField(b);
  const rangeA = getAgeRangeFromPreferences(a);
  const rangeB = getAgeRangeFromPreferences(b);
  let aPassAge = true;
  let bPassAge = true;
  if (ageB != null && rangeA) aPassAge = ageB >= rangeA.min && ageB <= rangeA.max;
  if (ageA != null && rangeB) bPassAge = ageA >= rangeB.min && ageA <= rangeB.max;
  const agePass = aPassAge && bPassAge;
  if (agePass) passed++;
  rows.push(makeRow(
    'age_range', 'Age Range',
    ageA != null ? [String(ageA)] : [],
    'Age Range',
    ageB != null ? [String(ageB)] : [],
    rangeB ? [`${rangeB.min}-${rangeB.max}`] : [],
    rangeA ? [`${rangeA.min}-${rangeA.max}`] : [],
    aPassAge, bPassAge, false,
  ));

  // ── Rule 2: Height Range ──
  total++;
  const heightA = getCandidateHeight(a);
  const heightB = getCandidateHeight(b);
  const hRangeA = getHeightRange(a);
  const hRangeB = getHeightRange(b);
  let aPassHeight = true;
  let bPassHeight = true;
  if (heightB != null && hRangeA) aPassHeight = heightB >= hRangeA.min && heightB <= hRangeA.max;
  if (heightA != null && hRangeB) bPassHeight = heightA >= hRangeB.min && heightA <= hRangeB.max;
  const heightPass = aPassHeight && bPassHeight;
  if (heightPass) passed++;
  rows.push(makeRow(
    'height_range', 'Height',
    heightA != null ? [`${heightA} in`] : [],
    'Height',
    heightB != null ? [`${heightB} in`] : [],
    hRangeB ? [`${hRangeB.min}-${hRangeB.max} in`] : [],
    hRangeA ? [`${hRangeA.min}-${hRangeA.max} in`] : [],
    aPassHeight, bPassHeight, false,
  ));

  // ── Rule 3: Past Marital Status ──
  // About header: "Past Martial Status" (note: "Martial" not "Marital" in the sheets)
  // Looking header: "Wife's/Husband's Past Marital Status"
  total++;
  const aAboutMarital = getValues(a, 'about', /past\s*martial\s*status|past\s*marital\s*status/i);
  const bAboutMarital = getValues(b, 'about', /past\s*martial\s*status|past\s*marital\s*status/i);
  const aSeekingMarital = getValues(a, 'looking', /past\s*martial|past\s*marital/i);
  const bSeekingMarital = getValues(b, 'looking', /past\s*martial|past\s*marital/i);
  const aMatchB_marital = hasCanonicalOverlap(aAboutMarital, bSeekingMarital, MARITAL_MAPPINGS);
  const bMatchA_marital = hasCanonicalOverlap(bAboutMarital, aSeekingMarital, MARITAL_MAPPINGS);
  const maritalPass = aMatchB_marital && bMatchA_marital;
  if (maritalPass) passed++;
  rows.push(makeRow(
    'marital_status', 'Past Marital Status',
    aAboutMarital, 'Past Marital Status', bAboutMarital,
    aSeekingMarital, bSeekingMarital,
    aMatchB_marital, bMatchA_marital, true,
  ));

  // ── Rule 4: Employment ──
  // Brother about: "Employment Status" → Sister looking: "Husband's Employment Status"
  // Sister about: "Post-Marriage Employment" → Brother looking: "Wife's Post-Marraige Employment"
  total++;
  const brotherAboutEmp = getValues(brother, 'about', /employment\s*status/i);
  const sisterSeekingEmp = getValues(sister, 'looking', /employment\s*status/i);
  const brotherPass = hasCanonicalOverlap(brotherAboutEmp, sisterSeekingEmp, EMPLOYMENT_STATUS_MAPPINGS);

  const sisterAboutEmp = getValues(sister, 'about', /post.*marriage.*employment|post.*marraige.*employment/i);
  const brotherSeekingEmp = getValues(brother, 'looking', /post.*marriage.*employment|post.*marraige.*employment|wife.*post.*mar/i);
  const sisterPass = hasCanonicalOverlap(sisterAboutEmp, brotherSeekingEmp, POST_MARRIAGE_EMPLOYMENT_MAPPINGS);

  const empPass = brotherPass && sisterPass;
  if (empPass) passed++;
  rows.push(makeRow(
    'employment', 'Employment',
    aIsBrother ? brotherAboutEmp : sisterAboutEmp,
    'Employment',
    aIsBrother ? sisterAboutEmp : brotherAboutEmp,
    aIsBrother ? brotherSeekingEmp : sisterSeekingEmp,
    aIsBrother ? sisterSeekingEmp : brotherSeekingEmp,
    aIsBrother ? brotherPass : sisterPass,
    aIsBrother ? sisterPass : brotherPass,
    true,
  ));

  // ── Rule 5: Prayer Habits ──
  total++;
  const aAboutPrayer = getValues(a, 'about', /prayer\s*habit/i);
  const bAboutPrayer = getValues(b, 'about', /prayer\s*habit/i);
  const aSeekingPrayer = getValues(a, 'looking', /prayer\s*habit/i);
  const bSeekingPrayer = getValues(b, 'looking', /prayer\s*habit/i);
  const aMatchB_prayer = hasCanonicalOverlap(aAboutPrayer, bSeekingPrayer, PRAYER_MAPPINGS);
  const bMatchA_prayer = hasCanonicalOverlap(bAboutPrayer, aSeekingPrayer, PRAYER_MAPPINGS);
  const prayerPass = aMatchB_prayer && bMatchA_prayer;
  if (prayerPass) passed++;
  rows.push(makeRow(
    'prayer', 'Prayer Habits',
    aAboutPrayer, 'Prayer Habits', bAboutPrayer,
    aSeekingPrayer, bSeekingPrayer,
    aMatchB_prayer, bMatchA_prayer, true,
  ));

  // ── Rule 6: Hijab (sister about → brother seeking only) ──
  // Sister about header: "Hijab" (no "Status" suffix)
  // Brother looking header: "Wife's Hijab Status"
  total++;
  const sisterAboutHijab = getValues(sister, 'about', /^hijab$|hijab\s*status/i);
  const brotherSeekingHijab = getValues(brother, 'looking', /hijab/i);
  const hijabPass = hasCanonicalOverlap(sisterAboutHijab, brotherSeekingHijab, HIJAB_MAPPINGS);
  if (hijabPass) passed++;
  rows.push(makeRow(
    'hijab', 'Hijab Status',
    aIsBrother ? [] : sisterAboutHijab,
    'Hijab Status',
    aIsBrother ? sisterAboutHijab : [],
    aIsBrother ? brotherSeekingHijab : [],
    aIsBrother ? [] : brotherSeekingHijab,
    aIsBrother ? hijabPass : true,
    aIsBrother ? true : hijabPass,
    true,
  ));

  // ── Rule 7: Islamic Atmosphere ──
  total++;
  const aAboutAtmos = getValues(a, 'about', /islamic\s*atmosphere|involvement.*islamic/i);
  const bAboutAtmos = getValues(b, 'about', /islamic\s*atmosphere|involvement.*islamic/i);
  const aSeekingAtmos = getValues(a, 'looking', /islamic\s*atmosphere|involvement.*islamic/i);
  const bSeekingAtmos = getValues(b, 'looking', /islamic\s*atmosphere|involvement.*islamic/i);
  const aMatchB_atmos = hasCanonicalOverlap(aAboutAtmos, bSeekingAtmos, ATMOSPHERE_MAPPINGS);
  const bMatchA_atmos = hasCanonicalOverlap(bAboutAtmos, aSeekingAtmos, ATMOSPHERE_MAPPINGS);
  const atmosPass = aMatchB_atmos && bMatchA_atmos;
  if (atmosPass) passed++;
  rows.push(makeRow(
    'atmosphere', 'Islamic Atmosphere',
    aAboutAtmos, 'Islamic Atmosphere', bAboutAtmos,
    aSeekingAtmos, bSeekingAtmos,
    aMatchB_atmos, bMatchA_atmos, true,
  ));

  // ── Rule 8: Halal Food ──
  // About header: "Halal Food Preference"
  // Looking header: "Wife's/Husband's Strictness on Halal Food"
  total++;
  const aAboutHalal = getValues(a, 'about', /halal\s*food|halal.*strict|strictness.*halal/i);
  const bAboutHalal = getValues(b, 'about', /halal\s*food|halal.*strict|strictness.*halal/i);
  const aSeekingHalal = getValues(a, 'looking', /halal\s*food|halal.*strict|strictness.*halal/i);
  const bSeekingHalal = getValues(b, 'looking', /halal\s*food|halal.*strict|strictness.*halal/i);
  const aMatchB_halal = hasCanonicalOverlap(aAboutHalal, bSeekingHalal, HALAL_MAPPINGS);
  const bMatchA_halal = hasCanonicalOverlap(bAboutHalal, aSeekingHalal, HALAL_MAPPINGS);
  const halalPass = aMatchB_halal && bMatchA_halal;
  if (halalPass) passed++;
  rows.push(makeRow(
    'halal', 'Halal Food',
    aAboutHalal, 'Halal Food', bAboutHalal,
    aSeekingHalal, bSeekingHalal,
    aMatchB_halal, bMatchA_halal, true,
  ));

  // ── Rule 9: Islamic Affiliation ──
  total++;
  const aAboutAffil = getValues(a, 'about', /islamic\s*affiliation|affiliation/i);
  const bAboutAffil = getValues(b, 'about', /islamic\s*affiliation|affiliation/i);
  const aSeekingAffil = getValues(a, 'looking', /islamic\s*affiliation|affiliation/i);
  const bSeekingAffil = getValues(b, 'looking', /islamic\s*affiliation|affiliation/i);
  const aMatchB_affil = hasCanonicalOverlap(aAboutAffil, bSeekingAffil, AFFILIATION_MAPPINGS);
  const bMatchA_affil = hasCanonicalOverlap(bAboutAffil, aSeekingAffil, AFFILIATION_MAPPINGS);
  const affilPass = aMatchB_affil && bMatchA_affil;
  if (affilPass) passed++;
  rows.push(makeRow(
    'affiliation', 'Islamic Affiliation',
    aAboutAffil, 'Islamic Affiliation', bAboutAffil,
    aSeekingAffil, bSeekingAffil,
    aMatchB_affil, bMatchA_affil, true,
  ));

  // ── Rule 10: Location & Relocation ──
  total++;
  const stateAAbout = getState(a, 'about');
  const stateBAbout = getState(b, 'about');
  const relocA = getWillingToRelocate(a);
  const relocB = getWillingToRelocate(b);
  const locationPass =
    stateAAbout === stateBAbout ||
    relocA || relocB ||
    stateAAbout == null || stateBAbout == null;
  if (locationPass) passed++;
  rows.push(makeRow(
    'location', 'State',
    stateAAbout ? [stateAAbout] : [],
    'State',
    stateBAbout ? [stateBAbout] : [],
    stateBAbout ? [stateBAbout] : [],
    stateAAbout ? [stateAAbout] : [],
    true, true, false,
  ));

  // ── Rule 11: Ethnicity ──
  total++;
  const aPassEth = checkEthnicityDirection(a, b);
  const bPassEth = checkEthnicityDirection(b, a);
  const ethPass = aPassEth && bPassEth;
  if (ethPass) passed++;
  const ethA = getEthnicity(a, 'about');
  const ethB = getEthnicity(b, 'about');
  rows.push(makeRow(
    'ethnicity', 'Country of Ethnicity',
    ethA, 'Country of Ethnicity', ethB,
    [], [],
    aPassEth, bPassEth, true,
  ));

  // ── Rule 12a: Living Situation (symmetric about↔about) ──
  total++;
  const aLiving = getValues(a, 'about', /living\s*situation/i);
  const bLiving = getValues(b, 'about', /living\s*situation/i);
  const livingPass = hasCanonicalOverlap(aLiving, bLiving, LIVING_SITUATION_MAPPINGS);
  if (livingPass) passed++;
  rows.push(makeRow(
    'living_situation', 'Living Situation Post Marriage',
    aLiving, 'Living Situation Post Marriage', bLiving,
    bLiving, aLiving,
    livingPass, livingPass, true,
  ));

  // ── Rule 12b: Financial & Home Roles (symmetric about↔about) ──
  total++;
  const aFinancial = getValues(a, 'about', /financial.*home.*role|financial\s*and\s*home/i);
  const bFinancial = getValues(b, 'about', /financial.*home.*role|financial\s*and\s*home/i);
  const financialPass = hasCanonicalOverlap(aFinancial, bFinancial, FINANCIAL_ROLES_MAPPINGS);
  if (financialPass) passed++;
  rows.push(makeRow(
    'financial_roles', 'Financial and Home Roles',
    aFinancial, 'Financial and Home Roles', bFinancial,
    bFinancial, aFinancial,
    financialPass, financialPass, true,
  ));

  // ── Result ──
  const isFullMatch = passed === total;
  const score = isFullMatch ? 100 : Math.round((passed / total) * 100);
  const matchedRows = rows.filter((r) => r.aMatchesB && r.bMatchesA);

  return {
    personA: a,
    personB: b,
    score,
    total,
    passed,
    rows,
    matchedRows,
  };
}

// ──────────────────────────────────────────────
//  Shared hobbies & ranking helpers
// ──────────────────────────────────────────────

function getSharedHobbies(a: PersonWithDetails, b: PersonWithDetails): string[] {
  const hobbiesA = getValues(a, 'about', /hobbies|interest/i);
  const hobbiesB = getValues(b, 'about', /hobbies|interest/i);
  const setB = new Set(hobbiesB);
  return hobbiesA.filter((h) => setB.has(h));
}

function ethnicityPreferTier(a: PersonWithDetails, b: PersonWithDetails): boolean {
  const ethPrefA = getEthnicityPreference(a);
  const ethPrefB = getEthnicityPreference(b);
  if (ethPrefA !== 'prefer' && ethPrefB !== 'prefer') return false;
  const ethA = getEthnicity(a, 'about');
  const ethB = getEthnicity(b, 'about');
  return hasOverlap(ethA, ethB);
}

// ──────────────────────────────────────────────
//  Public API
// ──────────────────────────────────────────────

export function findPotentialMatches(
  candidate: PersonWithDetails,
  pool: PersonWithDetails[],
  existingMatches: Match[],
  dismissedPairs: Array<[string, string, string]>,
): CompatibilityResult[] {
  const pairKey = (x: string, y: string) => [x, y].sort().join('|');
  const blocked = new Set<string>([
    ...existingMatches
      .filter((m) => m.outcome === 'failed' || m.outcome === 'manually_removed' || m.outcome === 'worked_out')
      .map((m) => pairKey(m.person_1_id, m.person_2_id)),
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
    .filter((r) => r.score === 100)
    .sort((a, b) => {
      const aPrefer = ethnicityPreferTier(a.personA, a.personB) ? 1 : 0;
      const bPrefer = ethnicityPreferTier(b.personA, b.personB) ? 1 : 0;
      if (aPrefer !== bPrefer) return bPrefer - aPrefer;
      const aHobbies = getSharedHobbies(a.personA, a.personB).length;
      const bHobbies = getSharedHobbies(b.personA, b.personB).length;
      return bHobbies - aHobbies;
    });
}

export function hasWorkedOut(personId: string, matches: Match[]): boolean {
  return matches.some(
    (m) =>
      m.outcome === 'worked_out' &&
      (m.person_1_id === personId || m.person_2_id === personId),
  );
}

export function countPotentialMatches(
  candidate: PersonWithDetails,
  pool: PersonWithDetails[],
  existingMatches: Match[],
  dismissedPairs: Array<[string, string, string]>,
): number {
  return findPotentialMatches(candidate, pool, existingMatches, dismissedPairs).length;
}

export function countPotentialMatchesAlreadyPaired(
  candidate: PersonWithDetails,
  pool: PersonWithDetails[],
  existingMatches: Match[],
  dismissedPairs: Array<[string, string, string]>,
): number {
  const results = findPotentialMatches(candidate, pool, existingMatches, dismissedPairs);
  return results.filter((r) => {
    const other = r.personA.id === candidate.id ? r.personB : r.personA;
    return existingMatches.some(
      (m) =>
        m.outcome === 'pending' &&
        (m.person_1_id === other.id || m.person_2_id === other.id),
    );
  }).length;
}

export function sharedHobbies(a: PersonWithDetails, b: PersonWithDetails): string[] {
  return getSharedHobbies(a, b);
}

export function hasPreferredEthnicity(a: PersonWithDetails, b: PersonWithDetails): boolean {
  return ethnicityPreferTier(a, b);
}

export { slug };

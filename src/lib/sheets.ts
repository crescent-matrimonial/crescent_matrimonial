import type { Gender, Person, QuestionField } from './types';

/**
 * Google Sheets CSV ingestion engine.
 *
 * Fetches the public CSV export endpoints for the Men and Women candidate
 * response sheets, parses headers into two structured sections ("About You"
 * and "What You're Looking For"), and produces Person rows ready for upsert.
 *
 * The sheet is expected to have a marker header that separates the two
 * sections; we fall back to header-text heuristics if no marker is found.
 */

export interface SheetConfig {
  url: string;
  gender: Gender;
  source: 'men' | 'women';
}

export const SHEETS: SheetConfig[] = [
  {
    url: 'https://docs.google.com/spreadsheets/d/19OGKR-tAZdFVN0xcpggjbB53a_EiaQ2952YknmBESFU/export?format=csv&gid=1002510155',
    gender: 'male',
    source: 'men',
  },
  {
    url: 'https://docs.google.com/spreadsheets/d/1-LvQDmGgOPBcThOpXHeBuQxxLqVSI5Sqk4ZVdahZJnk/export?format=csv&gid=474315395',
    gender: 'female',
    source: 'women',
  },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const isMulti = (header: string): boolean => /select all that apply/i.test(header);

/** Split a CSV row honoring quoted fields. */
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

/** Parse a full CSV document into rows of string arrays. */
function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      cur += ch;
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      }
    } else if (ch === '"') {
      inQuotes = true;
      cur += ch;
    } else if (ch === '\n') {
      rows.push(parseCsvLine(cur));
      cur = '';
    } else if (ch !== '\r') {
      cur += ch;
    }
  }
  if (cur.length) rows.push(parseCsvLine(cur));
  return rows;
}

/**
 * Determine the section for a header. Sheets typically use a section banner
 * row whose cells read "About You" / "What You're Looking For". If absent we
 * classify by header text: "Partner's ..." => looking, otherwise about.
 */
function classifyHeader(header: string): 'about' | 'looking' | null {
  const h = header.toLowerCase();
  if (h.includes("what you're looking for") || h.includes('looking for')) return 'looking';
  if (h.includes('about you')) return 'about';
  return null;
}

function deriveFirstName(full: string): string {
  return full.split(/\s+/)[0] ?? '';
}
function deriveLastName(full: string): string {
  const parts = full.split(/\s+/);
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
}

function parseAge(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/** Fetch + parse one sheet into Person rows (no DB writes here). */
export async function ingestSheet(sheet: SheetConfig): Promise<Person[]> {
  const res = await fetch(sheet.url);
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status}) for ${sheet.source}`);
  const csv = await res.text();
  return parseSheetCsv(csv, sheet);
}

/** Pure function: parse CSV text into Person rows. Exposed for tests/mocks. */
export function parseSheetCsv(csv: string, sheet: SheetConfig): Person[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headerRow = rows[0];

  // Detect a banner row: if row[1] has no answer-like content and matches a
  // section title, treat row[0] as banners and shift.
  let headers = headerRow;
  let sectionForRow: ('about' | 'looking' | null)[] = [];
  let startIdx = 1;

  const bannerTest = headerRow.some((h) => classifyHeader(h) !== null);
  if (bannerTest) {
    // Build per-column section from banner row.
    let current: 'about' | 'looking' | null = null;
    sectionForRow = headerRow.map((h) => {
      const cls = classifyHeader(h);
      if (cls) {
        current = cls;
        return null; // banner cell itself
      }
      return current;
    });
    // The next row holds the actual question headers.
    headers = rows[1];
    // Keep sectionForRow aligned to headers (same length assumed).
    startIdx = 2;
  } else {
    // No banner: classify each header by text.
    sectionForRow = headerRow.map((h) => {
      const cls = classifyHeader(h);
      return cls ?? (h.toLowerCase().startsWith("partner's") ? 'looking' : 'about');
    });
  }

  // Identify index of key columns (case-insensitive contains).
  const findIdx = (needle: string) =>
    headers.findIndex((h) => h.toLowerCase().includes(needle));

  const nameIdx = findIdx('full name') !== -1 ? findIdx('full name') : findIdx('name');
  const emailIdx = findIdx('email');
  const photoIdx = findIdx('photo') !== -1 ? findIdx('photo') : findIdx('avatar');
  const locationIdx = findIdx('location') !== -1 ? findIdx('location') : findIdx('city');
  const occupationIdx = findIdx('occupation') !== -1 ? findIdx('occupation') : findIdx('job');
  const ageIdx = findIdx('age');

  const people: Person[] = [];
  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => !c.trim())) continue;

    const fullName = (nameIdx !== -1 ? row[nameIdx] : '').trim();
    const email = (emailIdx !== -1 ? row[emailIdx] : '').trim();
    if (!fullName && !email) continue;

    const first = deriveFirstName(fullName);
    const last = deriveLastName(fullName);
    const sheetKey = `${first}|${last}|${email}`.toLowerCase();

    const about_you: Record<string, QuestionField> = {};
    const looking_for: Record<string, QuestionField> = {};

    headers.forEach((header, idx) => {
      if (idx === nameIdx || idx === emailIdx || idx === photoIdx ||
          idx === locationIdx || idx === occupationIdx || idx === ageIdx) return;
      const section = sectionForRow[idx];
      if (!section) return;
      const answer = (row[idx] ?? '').trim();
      if (!answer) return;
      const key = slug(header);
      const field: QuestionField = {
        key,
        question: header,
        answer,
        values: answer.split(',').map((v) => v.trim()).filter(Boolean),
        multi: isMulti(header),
        section,
      };
      if (section === 'about') about_you[key] = field;
      else looking_for[key] = field;
    });

    const person: Person = {
      id: '',
      first_name: first || null,
      last_name: last || null,
      full_name: fullName || null,
      email: email || null,
      gender: sheet.gender,
      profile_photo_url: photoIdx !== -1 ? (row[photoIdx]?.trim() || null) : null,
      age: parseAge(ageIdx !== -1 ? row[ageIdx] : undefined),
      location: locationIdx !== -1 ? (row[locationIdx]?.trim() || null) : null,
      occupation: occupationIdx !== -1 ? (row[occupationIdx]?.trim() || null) : null,
      about_you,
      looking_for,
      preferences: {},
      admin_notes: null,
      source_sheet: sheet.source,
      sheet_key: sheetKey,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    people.push(person);
  }
  return people;
}

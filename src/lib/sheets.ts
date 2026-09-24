import type { Gender, QuestionField } from './types';

/**
 * Google Sheets CSV ingestion engine.
 *
 * Fetches the public CSV export endpoints for the Brothers and Sisters
 * candidate response sheets, parses headers into two structured sections
 * ("About You" and "What You're Looking For"), and produces SheetProfile
 * rows keyed by email for in-memory enrichment of DB person records.
 *
 * Male candidates use the "brothers" sheet; female candidates use the
 * "sisters" sheet.
 */

export interface SheetConfig {
  url: string;
  gender: Gender;
  source: 'brothers' | 'sisters';
}

export const SHEETS: SheetConfig[] = [
  {
    url: 'https://docs.google.com/spreadsheets/d/1-LvQDmGgOPBcThOpXHeBuQxxLqVSI5Sqk4ZVdahZJnk/export?format=csv&gid=474315395',
    gender: 'male',
    source: 'brothers',
  },
  {
    url: 'https://docs.google.com/spreadsheets/d/19OGKR-tAZdFVN0xcpggjbB53a_EiaQ2952YknmBESFU/export?format=csv&gid=1002510155',
    gender: 'female',
    source: 'sisters',
  },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const isMulti = (header: string): boolean => /select all that apply/i.test(header);

/** A profile extracted from a Google Sheet row, keyed by email. */
export interface SheetProfile {
  email: string;
  full_name: string;
  gender: Gender;
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

function classifyHeader(header: string): 'about' | 'looking' | null {
  const h = header.toLowerCase();
  if (h.includes("what you're looking for") || h.includes('looking for')) return 'looking';
  if (h.includes('about you')) return 'about';
  return null;
}

function parseAge(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Pure number — already an age
  const pureNum = parseInt(trimmed, 10);
  if (!isNaN(pureNum) && /^\d{1,3}$/.test(trimmed)) return pureNum;

  // Try to parse as a date of birth and compute age
  const age = ageFromDob(trimmed);
  if (age != null) return age;

  // Fallback: extract first number
  const match = trimmed.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function ageFromDob(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // ISO format: YYYY-MM-DD
  let d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    // US format: MM/DD/YYYY or MM-DD-YYYY
    const usMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (usMatch) {
      let [, m, day, y] = usMatch;
      if (y.length === 2) y = '20' + y;
      d = new Date(parseInt(y), parseInt(m) - 1, parseInt(day));
    }
  }
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age <= 150 ? age : null;
}

/**
 * Convert a Google Drive file URL into a direct-image thumbnail URL.
 * Google Forms stores uploaded photos as Drive links like:
 *   https://drive.google.com/open?id=FILE_ID
 *   https://drive.google.com/file/d/FILE_ID/view
 * We convert to: https://drive.google.com/thumbnail?id=FILE_ID&sz=w400
 * which serves the image directly and is embeddable in <img> tags.
 * If the value is already a direct image URL (https://.../*.jpg), return as-is.
 */
function parsePhotoUrl(value: string): string | null {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;

  // Already a direct image URL
  if (/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|avif)/i.test(v)) return v;

  // https://drive.google.com/file/d/FILE_ID/view?...
  const fileIdMatch = v.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileIdMatch) return `https://drive.google.com/thumbnail?id=${fileIdMatch[1]}&sz=w400`;

  // https://drive.google.com/open?id=FILE_ID
  const openIdMatch = v.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (openIdMatch) return `https://drive.google.com/thumbnail?id=${openIdMatch[1]}&sz=w400`;

  // https://drive.google.com/uc?id=FILE_ID
  const ucIdMatch = v.match(/uc\?[?&]*id=([a-zA-Z0-9_-]+)/);
  if (ucIdMatch) return `https://drive.google.com/thumbnail?id=${ucIdMatch[1]}&sz=w400`;

  // If it looks like any other URL, return it as-is
  if (/^https?:\/\//i.test(v)) return v;

  return null;
}

/** Fetch + parse one sheet into SheetProfile rows (no DB writes here). */
export async function ingestSheet(sheet: SheetConfig): Promise<SheetProfile[]> {
  const res = await fetch(sheet.url);
  if (!res.ok) throw new Error(`Sheet fetch failed (${res.status}) for ${sheet.source}`);
  const csv = await res.text();
  return parseSheetCsv(csv, sheet);
}

/** Pure function: parse CSV text into SheetProfile rows. */
export function parseSheetCsv(csv: string, sheet: SheetConfig): SheetProfile[] {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const headerRow = rows[0];

  let headers = headerRow;
  let sectionForRow: ('about' | 'looking' | null)[] = [];
  let startIdx = 1;

  const bannerTest = headerRow.some((h) => classifyHeader(h) !== null);
  if (bannerTest) {
    let current: 'about' | 'looking' | null = null;
    sectionForRow = headerRow.map((h) => {
      const cls = classifyHeader(h);
      if (cls) {
        current = cls;
        return null;
      }
      return current;
    });
    headers = rows[1];
    startIdx = 2;
  } else {
    sectionForRow = headerRow.map((h) => {
      const cls = classifyHeader(h);
      if (cls) return cls;
      const lh = h.toLowerCase();
      if (lh.startsWith("partner's") || lh.startsWith("wife's") || lh.startsWith("husband's")) return 'looking';
      if (lh.includes('how many years')) return 'looking';
      return 'about';
    });
  }

  const findIdx = (needle: string) =>
    headers.findIndex((h) => h.toLowerCase().includes(needle));

  const nameIdx = findIdx('full name') !== -1 ? findIdx('full name') : findIdx('name');
  const emailIdx = findIdx('email');
  const photoIndices: number[] = [];
  headers.forEach((h, i) => {
    const lh = h.toLowerCase();
    if (lh.includes('photo') || lh.includes('avatar') || lh.includes('picture') || lh.includes('image')) {
      photoIndices.push(i);
    }
  });
  const photoIdx = photoIndices[0] ?? -1;
  const locationIdx = findIdx('location') !== -1 ? findIdx('location') : findIdx('city');
  const occupationIdx = findIdx('occupation') !== -1 ? findIdx('occupation') : findIdx('job');
  const ageIdx = headers.findIndex((h) => /\bage\b/i.test(h.trim()));
  const dobIdx = headers.findIndex((h) => {
    const lh = h.toLowerCase().trim();
    return /\b(dob|date of birth|birth date|birthday|date of birth|born on|your date of birth|what is your date of birth)\b/i.test(lh)
      || /\bbirth\b/i.test(lh);
  });
  const adminNoteIdx = findIdx('note for admin') !== -1 ? findIdx('note for admin') : findIdx('admin note');
  const bioDataUrlIdx = findIdx('bio data') !== -1 ? findIdx('bio data') : findIdx('biodata');

  const profiles: SheetProfile[] = [];
  for (let r = startIdx; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((c) => !c.trim())) continue;

    const fullName = (nameIdx !== -1 ? row[nameIdx] : '').trim();
    const email = (emailIdx !== -1 ? row[emailIdx] : '').trim();
    if (!fullName && !email) continue;

    const about_you: Record<string, QuestionField> = {};
    const looking_for: Record<string, QuestionField> = {};

    headers.forEach((header, idx) => {
      if (idx === nameIdx || idx === emailIdx || photoIndices.includes(idx) ||
          idx === locationIdx || idx === occupationIdx || idx === ageIdx ||
          idx === adminNoteIdx || idx === bioDataUrlIdx) return;
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

    const photoUrls = photoIndices
      .flatMap((i) =>
        (row[i]?.trim() || '')
          .split(',')
          .map((url) => parsePhotoUrl(url.trim()))
          .filter((u): u is string => !!u),
      );

    profiles.push({
      email,
      full_name: fullName,
      gender: sheet.gender,
      age: parseAge(ageIdx !== -1 ? row[ageIdx] : (dobIdx !== -1 ? row[dobIdx] : undefined)),
      location: locationIdx !== -1 ? (row[locationIdx]?.trim() || null) : null,
      occupation: occupationIdx !== -1 ? (row[occupationIdx]?.trim() || null) : null,
      profile_photo_url: photoUrls[0] ?? null,
      photo_urls: photoUrls,
      admin_note: adminNoteIdx !== -1 ? (row[adminNoteIdx]?.trim() || null) : null,
      bio_data_url: bioDataUrlIdx !== -1 ? (row[bioDataUrlIdx]?.trim() || null) : null,
      about_you,
      looking_for,
    });
  }
  return profiles;
}

/**
 * Fetch all sheets and return a map keyed by email -> SheetProfile.
 * Used by the data layer to enrich DB person records with sheet details.
 */
export async function fetchAllSheetProfiles(): Promise<Map<string, SheetProfile>> {
  const allProfiles = await Promise.all(SHEETS.map((s) => ingestSheet(s)));
  const map = new Map<string, SheetProfile>();
  for (const profiles of allProfiles) {
    for (const p of profiles) {
      if (p.email) map.set(p.email.toLowerCase(), p);
    }
  }
  return map;
}

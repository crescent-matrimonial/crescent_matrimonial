import { useState } from 'react';
import {
  Users,
  ExternalLink,
  Heart,
  ArrowRightLeft,
} from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { PhotoCarousel } from './PhotoCarousel';
import { computeCompatibility, sharedHobbies } from '@/lib/matching';
import type { PersonWithDetails } from '@/lib/types';
import type { QuestionField } from '@/lib/types';

function renderFieldValue(f: QuestionField | undefined) {
  if (!f) return <span className="text-slate-600">—</span>;
  if (f.multi && f.values.length > 1) {
    return (
      <ul className="list-disc pl-4 space-y-0.5">
        {f.values.map((v) => (
          <li key={v}>{v}</li>
        ))}
      </ul>
    );
  }
  return <span>{f.answer || '—'}</span>;
}

function AllResponsesSection({
  candidate,
  match,
}: {
  candidate: PersonWithDetails;
  match: PersonWithDetails;
}) {
  const [open, setOpen] = useState(false);

  const normalizeQ = (q: string) =>
    q
      .toLowerCase()
      .replace(/partner'?s?\s*/i, '')
      .replace(/looking\s*for/i, '')
      .replace(/preference/i, '')
      .trim();

  type Row = {
    question: string;
    section: 'about' | 'looking';
    candidateField: QuestionField | undefined;
    matchField: QuestionField | undefined;
  };

  const rows: Row[] = (() => {
    const candAbout = Object.values(candidate.about_you);
    const candLooking = Object.values(candidate.looking_for);
    const matchAbout = Object.values(match.about_you);
    const matchLooking = Object.values(match.looking_for);

    const seen = new Map<string, Row>();

    const addRow = (
      field: QuestionField,
      section: 'about' | 'looking',
      isCandidate: boolean,
    ) => {
      const key = normalizeQ(field.question);
      const existing = seen.get(key);
      if (existing) {
        if (isCandidate) existing.candidateField = field;
        else existing.matchField = field;
      } else {
        seen.set(key, {
          question: field.question,
          section,
          candidateField: isCandidate ? field : undefined,
          matchField: isCandidate ? undefined : field,
        });
      }
    };

    for (const f of candAbout) addRow(f, 'about', true);
    for (const f of matchAbout) addRow(f, 'about', false);
    for (const f of candLooking) addRow(f, 'looking', true);
    for (const f of matchLooking) addRow(f, 'looking', false);

    return Array.from(seen.values());
  })();

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-700/60 bg-slate-900/40 px-4 py-3 text-left transition hover:bg-slate-800/40"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          All Responses Side by Side
        </span>
        <span className="text-xs text-sky-400">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/60 bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-2 text-left font-medium w-1/3">Question</th>
                <th className="px-3 py-2 text-left font-medium w-1/3">
                  {candidate.full_name}
                </th>
                <th className="px-3 py-2 text-left font-medium w-1/3">
                  {match.full_name}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40"
                >
                  <td className="px-3 py-2 text-xs text-slate-400">{row.question}</td>
                  <td className="px-3 py-2 text-slate-200">
                    {renderFieldValue(row.candidateField)}
                  </td>
                  <td className="px-3 py-2 text-slate-200">
                    {renderFieldValue(row.matchField)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PersonHeader({
  person,
  onPhotoClick,
}: {
  person: PersonWithDetails;
  onPhotoClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <button
        onClick={onPhotoClick}
        className="shrink-0 cursor-pointer rounded-full transition hover:ring-4 hover:ring-sky-500/20"
        title="Click to view photos"
      >
        <Avatar person={person} size="xl" />
      </button>
      <div>
        <h3 className="text-base font-semibold text-slate-100">{person.full_name}</h3>
        {person.age != null && <p className="text-xs text-slate-500">{person.age} yrs old</p>}
      </div>
    </div>
  );
}

interface PairDetailsModalProps {
  personA: PersonWithDetails | null;
  personB: PersonWithDetails | null;
  open: boolean;
  onClose: () => void;
  /** Optional footer actions (e.g. initiate pair, dismiss). */
  footer?: React.ReactNode;
  /** Title for the modal. Defaults to "Pair Details". */
  title?: string;
}

export function PairDetailsModal({
  personA,
  personB,
  open,
  onClose,
  footer,
  title = 'Pair Details',
}: PairDetailsModalProps) {
  const [photoView, setPhotoView] = useState<{ photos: string[]; name: string } | null>(null);

  if (!personA || !personB) {
    return (
      <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-4xl">
        <p className="text-sm text-slate-500">Unable to load pair details.</p>
      </Modal>
    );
  }

  const result = computeCompatibility(personA, personB);
  const hobbies = sharedHobbies(personA, personB);

  const photoArgs = (person: PersonWithDetails) => ({
    photos:
      person.photo_urls.length > 0
        ? person.photo_urls
        : person.profile_photo_url
          ? [person.profile_photo_url]
          : [],
    name: person.full_name,
  });

  return (
    <>
      <Modal open={open} onClose={onClose} title={title} maxWidth="max-w-4xl">
        <div className="space-y-5">
          {/* Both photos and names */}
          <div className="flex items-center justify-around gap-4 rounded-xl border border-slate-700/60 bg-slate-900/40 p-5">
            <PersonHeader
              person={personA}
              onPhotoClick={() => setPhotoView(photoArgs(personA))}
            />
            <div className="flex flex-col items-center text-slate-500">
              <Users className="h-7 w-7 text-sky-400" />
              <span className="mt-1 text-[10px] uppercase tracking-wider">
                Under Consideration
              </span>
            </div>
            <PersonHeader
              person={personB}
              onPhotoClick={() => setPhotoView(photoArgs(personB))}
            />
          </div>

          {/* Bio Data submission links */}
          <div className="flex justify-center gap-3">
            {personA.bio_data_url ? (
              <a
                href={personA.bio_data_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {personA.full_name}'s Bio Data
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-500">
                <ExternalLink className="h-3.5 w-3.5" /> {personA.full_name}'s Bio Data (not available)
              </span>
            )}
            {personB.bio_data_url ? (
              <a
                href={personB.bio_data_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/10"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {personB.full_name}'s Bio Data
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-500">
                <ExternalLink className="h-3.5 w-3.5" /> {personB.full_name}'s Bio Data (not available)
              </span>
            )}
          </div>

          {/* Compatibility summary */}
          <div className="flex items-center justify-center gap-3 rounded-lg bg-slate-950/40 px-4 py-2">
            <ArrowRightLeft className="h-4 w-4 text-sky-400" />
            <span className="text-sm text-slate-300">
              Compatibility score:{' '}
              <span className="font-semibold text-slate-100">{result.score}%</span>
              <span className="ml-2 text-xs text-slate-500">
                ({result.passed}/{result.total} criteria passed)
              </span>
            </span>
          </div>

          {hobbies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 rounded-lg bg-slate-950/40 px-3 py-2">
              <span className="text-xs text-slate-500">Shared hobbies:</span>
              {hobbies.map((h) => (
                <span
                  key={h}
                  className="rounded-md bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300"
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Collapsible: all responses side by side */}
          <AllResponsesSection candidate={personA} match={personB} />

          {footer && (
            <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
              {footer}
            </div>
          )}
        </div>
      </Modal>

      {photoView && (
        <PhotoCarousel
          photos={photoView.photos}
          name={photoView.name}
          onClose={() => setPhotoView(null)}
        />
      )}
    </>
  );
}

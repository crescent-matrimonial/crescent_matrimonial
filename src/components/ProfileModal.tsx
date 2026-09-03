import { useState } from 'react';
import { Trash2, Archive, ExternalLink } from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';
import { PhotoCarousel } from './PhotoCarousel';
import type { Match, PersonWithDetails, QuestionField } from '@/lib/types';
import { useData } from '@/lib/data';
import { ComparisonSearch } from './ComparisonSearch';

function getStateOfResidence(person: PersonWithDetails): string | null {
  const dict = person.about_you;
  const field = Object.values(dict).find((f) => /state.*reside|state.*live/i.test(f.question.toLowerCase()));
  if (field && field.answer.trim()) return field.answer.trim();
  return null;
}

interface ProfileModalProps {
  person: PersonWithDetails | null;
  open: boolean;
  onClose: () => void;
}

function SectionList({ title, fields }: { title: string; fields: Record<string, QuestionField> }) {
  const entries = Object.values(fields);
  if (entries.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h4>
      <dl className="space-y-2.5">
        {entries.map((f) => (
          <div key={f.key} className="grid grid-cols-1 gap-0.5">
            <dt className="text-xs font-medium text-slate-500">{f.question}</dt>
            <dd className="text-sm text-slate-200">
              {f.multi && f.values.length > 1 ? (
                <ul className="list-disc pl-4 space-y-0.5">
                  {f.values.map((v) => (
                    <li key={v}>{v}</li>
                  ))}
                </ul>
              ) : (
                f.answer
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ProfileModal({ person, open, onClose }: ProfileModalProps) {
  const { matches, people, softDeletePerson, hardDeletePerson } = useData();
  const [removeOpen, setRemoveOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!person) return null;

  const personMatches = matches.filter(
    (m) => m.person_1_id === person.id || m.person_2_id === person.id,
  );
  const activeMatch = personMatches.find((m) => m.outcome === 'pending');
  const pastMatches = personMatches.filter((m) => m.outcome !== 'pending');
  const partnerName = (m: Match) => {
    const pid = m.person_1_id === person.id ? m.person_2_id : m.person_1_id;
    const p = people.find((x) => x.id === pid);
    return p?.full_name ?? 'Unknown';
  };

  const handleSoft = async () => {
    await softDeletePerson(person.id);
    setRemoveOpen(false);
    onClose();
  };
  const handleHard = async () => {
    await hardDeletePerson(person.id);
    setRemoveOpen(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={open && !removeOpen}
        onClose={onClose}
        title="Candidate Profile"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <button
              onClick={() => setPhotoOpen(true)}
              className="shrink-0 cursor-pointer rounded-full transition hover:ring-4 hover:ring-sky-500/20"
              title="Click to view photos"
            >
              <Avatar person={person} size="xl" />
            </button>
            <div className="flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-xl font-semibold text-slate-100">
                    {person.full_name}
                  </h3>
                  <p className="text-sm text-slate-400">{person.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                    {person.age != null && <span>{person.age} yrs</span>}
                    {getStateOfResidence(person) && (
                      <span className="flex items-center gap-x-1.5">
                        {person.age != null && <span className="text-slate-700">•</span>}
                        {getStateOfResidence(person)}
                      </span>
                    )}
                    {person.location && (
                      <span className="flex items-center gap-x-1.5">
                        <span className="text-slate-700">•</span>
                        {person.location}
                      </span>
                    )}
                    {person.occupation && (
                      <span className="flex items-center gap-x-1.5">
                        <span className="text-slate-700">•</span>
                        {person.occupation}
                      </span>
                    )}
                  </div>
                </div>
                {person.bio_data_url && (
                  <a
                    href={person.bio_data_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 transition hover:bg-sky-500/20"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Bio Data
                  </a>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeMatch ? (
                  <StatusBadge status="active" />
                ) : (
                  <StatusBadge status="available" />
                )}
                {pastMatches.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-300">
                    Match History ({pastMatches.length})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Survey responses */}
          <div className="grid gap-6 md:grid-cols-2">
            <SectionList title="About You" fields={person.about_you} />
            <SectionList title="What You're Looking For" fields={person.looking_for} />
          </div>

          {/* Compare with another candidate */}
          <ComparisonSearch person={person} />

          {/* Match history */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Interaction History ({personMatches.length})
            </h4>
            {personMatches.length === 0 ? (
              <p className="text-sm text-slate-500">No pairings recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {personMatches.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-slate-200">{partnerName(m)}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {new Date(m.paired_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {m.exchanged_contact && (
                          <span className="text-xs text-sky-400">Contact exchanged</span>
                        )}
                        <StatusBadge status={m.outcome} />
                      </div>
                    </div>
                    {m.notes && (
                      <p className="mt-1.5 text-xs text-slate-500">{m.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex justify-end gap-3 border-t border-slate-700/60 pt-4">
            <button
              onClick={() => setRemoveOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" /> Remove Candidate
            </button>
          </div>
        </div>
      </Modal>

      {photoOpen && (
        <PhotoCarousel
          photos={person.photo_urls.length > 0 ? person.photo_urls : (person.profile_photo_url ? [person.profile_photo_url] : [])}
          name={person.full_name}
          onClose={() => setPhotoOpen(false)}
        />
      )}

      {/* Remove confirmation */}
      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove Candidate"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Choose how to remove <strong className="text-slate-100">{person.full_name}</strong>:
          </p>
          <div className="space-y-3">
            <button
              onClick={handleSoft}
              className="flex w-full items-start gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-left transition hover:border-amber-500/40"
            >
              <Archive className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-slate-100">Soft Delete (Recommended)</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Marks the candidate as removed and hides them from the directory, but keeps
                  their match history intact.
                </p>
              </div>
            </button>
            <button
              onClick={handleHard}
              className="flex w-full items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 text-left transition hover:border-rose-500/60"
            >
              <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-slate-100">Hard Delete (Permanent)</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Permanently removes the candidate and all their match records. This cannot be
                  undone.
                </p>
              </div>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

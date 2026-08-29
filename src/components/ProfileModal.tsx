import { useState } from 'react';
import { Trash2, Save, Archive, MessageSquare } from 'lucide-react';
import { Modal } from './Modal';
import { Avatar } from './Avatar';
import { StatusBadge } from './StatusBadge';
import type { Match, Person, QuestionField } from '@/lib/types';
import { useData } from '@/lib/data';

interface ProfileModalProps {
  person: Person | null;
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
                <span className="flex flex-wrap gap-1.5">
                  {f.values.map((v) => (
                    <span
                      key={v}
                      className="rounded-md bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                    >
                      {v}
                    </span>
                  ))}
                </span>
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
  const { matches, people, updatePerson, softDeletePerson, hardDeletePerson } = useData();
  const [editing, setEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [removeOpen, setRemoveOpen] = useState(false);

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

  const saveNotes = async () => {
    await updatePerson(person.id, { admin_notes: notes });
    setEditing(false);
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
            <Avatar person={person} size="xl" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-slate-100">
                {person.full_name ?? 'Unnamed'}
              </h3>
              <p className="text-sm text-slate-400">{person.email}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                {person.age && <span>{person.age} yrs</span>}
                {person.location && <span>• {person.location}</span>}
                {person.occupation && <span>• {person.occupation}</span>}
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

          {/* Admin notes */}
          <div className="rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <MessageSquare className="h-3.5 w-3.5" /> Admin Notes
              </h4>
              {!editing && (
                <button
                  onClick={() => {
                    setNotes(person.admin_notes ?? '');
                    setEditing(true);
                  }}
                  className="text-xs text-sky-400 hover:text-sky-300"
                >
                  Edit
                </button>
              )}
            </div>
            {editing ? (
              <div className="space-y-2">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNotes}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                  >
                    <Save className="h-3.5 w-3.5" /> Save
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-300">
                {person.admin_notes || <span className="text-slate-500">No notes yet.</span>}
              </p>
            )}
          </div>

          {/* Survey responses */}
          <div className="grid gap-6 md:grid-cols-2">
            <SectionList title="About You" fields={person.about_you} />
            <SectionList title="What You're Looking For" fields={person.looking_for} />
          </div>

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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-950/40 px-3 py-2.5 text-sm"
                  >
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

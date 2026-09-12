import { useState } from 'react';
import { Settings, ShieldAlert, Check } from 'lucide-react';
import { Modal } from './Modal';
import { readSettings, writeSettings, type DashboardSettings } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/auth';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState<DashboardSettings>(() => readSettings());
  const [saved, setSaved] = useState(false);
  const { refreshKeyState, authRequired, setAuthRequired } = useAuth();

  const save = () => {
    writeSettings(draft);
    setSaved(true);
    refreshKeyState();
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  };

  return (
    <Modal open={open} onClose={onClose} title="Configuration" maxWidth="max-w-lg">
      <div className="space-y-5">
        <div>
          <label className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">Require Sign-In</span>
            <button
              onClick={() => setAuthRequired(!authRequired)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                authRequired ? 'bg-sky-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  authRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </label>
          <p className="text-xs text-slate-500">
            {authRequired
              ? 'Users must sign in with their email to access the dashboard.'
              : 'Dashboard is accessible without sign-in.'}
          </p>
        </div>

        <div className="border-t border-slate-700" />

        <div className="flex items-start gap-3 rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-sm text-sky-200">
          <Settings className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
          <p>
            Enter your Supabase project URL and anonymous key. These are pre-filled with
            the Crescent Matrimonial project credentials — change them only if you want to
            point at a different project.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Supabase Project URL
          </label>
          <input
            type="text"
            value={draft.supabaseUrl}
            onChange={(e) => setDraft({ ...draft, supabaseUrl: e.target.value })}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            placeholder="https://yourproject.supabase.co"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Supabase Anonymous Key
          </label>
          <textarea
            value={draft.supabaseAnonKey}
            onChange={(e) => setDraft({ ...draft, supabaseAnonKey: e.target.value })}
            rows={4}
            className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 font-mono text-xs text-slate-100 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          />
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            Stored locally in your browser only. Never sent anywhere except Supabase.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-sky-900/30 transition hover:bg-sky-500"
          >
            {saved ? (
              <>
                <Check className="h-4 w-4" /> Saved
              </>
            ) : (
              'Save Configuration'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

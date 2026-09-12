import { ShieldCheck, Lock } from 'lucide-react';
import { Modal } from './Modal';
import { useAuth } from '@/lib/auth';

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { authRequired, setAuthRequired } = useAuth();

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
              ? 'Users must sign in with their Google account to access the dashboard.'
              : 'Dashboard is accessible without sign-in.'}
          </p>
        </div>

        <div className="border-t border-slate-700" />

        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-200">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <p>
            This dashboard is connected to your Crescent Matrimonial Supabase project.
            Database and email settings are managed in your Supabase dashboard.
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-slate-700/40 bg-slate-800/30 p-3 text-sm text-slate-400">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <p>
            To change the Supabase project, update the <code className="rounded bg-slate-950/60 px-1.5 py-0.5 font-mono text-xs text-slate-300">.env</code> file with your
            project URL and anon key, then restart the app.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

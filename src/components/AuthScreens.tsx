import { Chrome, ShieldCheck, LogIn, Database } from 'lucide-react';
import { useAuth, ADMIN_EMAIL } from '@/lib/auth';
import { useState } from 'react';
import { SettingsModal } from './SettingsModal';

export function LoginScreen() {
  const { state, signInWithGoogle } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const isNeedsKey = state.status === 'needs_key';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 shadow-lg shadow-sky-900/50">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Crescent Matrimonial</h1>
          <p className="mt-1 text-sm text-slate-400">Admin Matchmaking Dashboard</p>
        </div>

        <div className="rounded-2xl border border-slate-700/60 bg-slate-900/80 p-8 shadow-xl">
          {isNeedsKey && (
            <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              <p className="font-medium">Demo mode active</p>
              <p className="mt-1 text-amber-200/80">
                No Supabase anon key configured. The app is running with sample data. Add your key
                to enable Google sign-in and live data.
              </p>
            </div>
          )}

          <p className="mb-6 text-center text-sm text-slate-300">
            Sign in with the authorized admin Google account to continue.
          </p>

          <button
            onClick={signInWithGoogle}
            disabled={isNeedsKey}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Chrome className="h-5 w-5" />
            Continue with Google
          </button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <LogIn className="h-3.5 w-3.5" />
            Authorized account: <span className="font-mono text-slate-400">{ADMIN_EMAIL}</span>
          </div>

          <div className="mt-6 border-t border-slate-700/60 pt-5">
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              <Database className="h-4 w-4" />
              Configure Supabase Key
            </button>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export function AccessDeniedScreen() {
  const { signOut, state } = useAuth();
  const email = state.status === 'denied' ? state.user?.email : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/20 ring-1 ring-rose-500/40">
          <ShieldCheck className="h-8 w-8 text-rose-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-400">Unauthorized Account</p>

        <div className="mt-6 rounded-2xl border border-rose-500/30 bg-slate-900/80 p-6 text-left">
          <p className="text-sm text-slate-300">
            The Google account you signed in with is not on the admin whitelist.
          </p>
          {email && (
            <p className="mt-3 rounded-lg bg-slate-950/60 px-3 py-2 font-mono text-xs text-rose-300">
              {email}
            </p>
          )}
          <p className="mt-3 text-xs text-slate-500">
            Only <span className="font-mono text-slate-400">{ADMIN_EMAIL}</span> may access this
            dashboard. You have been signed out automatically.
          </p>
          <button
            onClick={signOut}
            className="mt-5 w-full rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Sign Out & Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

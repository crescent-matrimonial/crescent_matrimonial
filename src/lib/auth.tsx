import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase, hasConfiguredKey, resetSupabaseClient } from './supabaseClient';

const ADMIN_EMAIL = 'crescentmatrimonial@gmail.com';
const LEGACY_AUTH_REQUIRED_KEY = 'crescent_auth_required';

// Sign-in is always required. A previous version allowed this to be switched
// off from a value held in the browser, which any visitor could set. Remove any
// leftover value so it can never be read again.
try {
  localStorage.removeItem(LEGACY_AUTH_REQUIRED_KEY);
} catch {
  /* ignore unavailable storage */
}

type AuthState =
  | { status: 'loading' }
  | { status: 'needs_key' }
  | { status: 'unauthenticated' }
  | { status: 'denied'; user: User | null }
  | { status: 'authenticated'; user: User; session: Session };

interface AuthContextValue {
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshKeyState: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    if (!hasConfiguredKey()) {
      setState({ status: 'needs_key' });
      return;
    }
    const supabase = getSupabase();

    // Initial session check.
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        setState({ status: 'unauthenticated' });
        return;
      }
      if (session.user.email !== ADMIN_EMAIL) {
        await supabase.auth.signOut();
        setState({ status: 'denied', user: session.user });
        return;
      }
      setState({ status: 'authenticated', user: session.user, session });
    })();

    // Subscribe to auth changes. Wrap async work to avoid deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!session?.user) {
          setState({ status: 'unauthenticated' });
          return;
        }
        if (session.user.email !== ADMIN_EMAIL) {
          await supabase.auth.signOut();
          setState({ status: 'denied', user: session.user });
          return;
        }
        setState({ status: 'authenticated', user: session.user, session });
      })();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      signInWithGoogle: async () => {
        const supabase = getSupabase();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}${window.location.pathname}`,
            scopes: 'openid email profile',
            queryParams: {
              prompt: 'select_account',
            },
          },
        });
        if (error) throw error;
      },
      signOut: async () => {
        const supabase = getSupabase();
        await supabase.auth.signOut();
        setState({ status: 'unauthenticated' });
      },
      refreshKeyState: () => {
        resetSupabaseClient();
        if (!hasConfiguredKey()) {
          setState({ status: 'needs_key' });
        } else {
          setState({ status: 'unauthenticated' });
        }
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { ADMIN_EMAIL };

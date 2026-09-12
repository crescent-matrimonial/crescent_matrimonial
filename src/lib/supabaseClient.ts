import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SETTINGS_KEY = 'crescent_dashboard_settings';

// Always use the project configured in .env — no hardcoded fallback.
const ENV_URL = import.meta.env.VITE_SUPABASE_URL;
const ENV_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export interface DashboardSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Returns the Supabase URL + anon key from the .env configuration.
 * The old localStorage override path has been removed.
 */
export function readSettings(): DashboardSettings {
  return {
    supabaseUrl: ENV_URL,
    supabaseAnonKey: ENV_KEY,
  };
}

let client: SupabaseClient | null = null;

/** Returns a cached singleton client. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!ENV_URL || !ENV_KEY) {
      throw new Error(
        'Supabase environment variables are not set. Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
    client = createClient(ENV_URL, ENV_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Resets the cached client (kept for compatibility). */
export function resetSupabaseClient(): void {
  client = null;
}

/** Whether a usable anon key has been provided. */
export function hasConfiguredKey(): boolean {
  return Boolean(ENV_KEY);
}

// One-time cleanup: remove any stale credential overrides from the old
// localStorage-based settings so the app always uses the .env project.
try {
  localStorage.removeItem(SETTINGS_KEY);
} catch {
  /* ignore */
}

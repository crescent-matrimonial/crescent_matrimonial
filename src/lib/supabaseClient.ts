import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const AUTH_REQUIRED_KEY = 'crescent_auth_required';

export interface DashboardSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Returns the single, project-configured Supabase URL + anon key
 * from environment variables. There is no override path.
 */
export function readSettings(): DashboardSettings {
  return {
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  };
}

let client: SupabaseClient | null = null;

/** Returns a cached singleton client. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase environment variables are not set. Check your .env file for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
      );
    }
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

/** Whether a usable anon key has been provided. */
export function hasConfiguredKey(): boolean {
  return Boolean(SUPABASE_ANON_KEY);
}

// ---- Auth-required toggle (kept in localStorage; unrelated to credentials) ----

export function getAuthRequired(): boolean {
  const stored = localStorage.getItem(AUTH_REQUIRED_KEY);
  return stored ? JSON.parse(stored) : true;
}

export function setAuthRequired(required: boolean): void {
  localStorage.setItem(AUTH_REQUIRED_KEY, JSON.stringify(required));
}

// ---- One-time migration: remove stale bolt-era credential caches ----

const OLD_SETTINGS_KEY = 'crescent_dashboard_settings';
try {
  localStorage.removeItem(OLD_SETTINGS_KEY);
} catch {
  /* ignore */
}

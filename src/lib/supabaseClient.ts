import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SETTINGS_KEY = 'crescent_dashboard_settings';
const DEFAULT_URL = 'https://saefetnlvblsrbtvyorg.supabase.co';
const DEFAULT_KEY = 'sb_publishable_KWhYObgC3mVuFRJuwzu_6w_skJsg1fn';

export interface DashboardSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Reads the admin-configured Supabase URL + publishable key from localStorage,
 * falling back to the project defaults (the Crescent Matrimonial Supabase
 * project + its publishable key).
 */
export function readSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DashboardSettings>;
      if (parsed.supabaseUrl && parsed.supabaseAnonKey) {
        return {
          supabaseUrl: parsed.supabaseUrl,
          supabaseAnonKey: parsed.supabaseAnonKey,
        };
      }
    }
  } catch {
    /* ignore corrupted storage */
  }
  return {
    supabaseUrl: DEFAULT_URL,
    supabaseAnonKey: DEFAULT_KEY,
  };
}

export function writeSettings(settings: DashboardSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

let client: SupabaseClient | null = null;
let clientKey = '';

/** Returns a cached singleton client keyed by url+key so settings changes pick up. */
export function getSupabase(): SupabaseClient {
  const settings = readSettings();
  const key = `${settings.supabaseUrl}::${settings.supabaseAnonKey}`;
  if (!client || clientKey !== key) {
    client = createClient(settings.supabaseUrl, settings.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    clientKey = key;
  }
  return client;
}

/** Resets the cached client after settings have been updated. */
export function resetSupabaseClient(): void {
  client = null;
  clientKey = '';
}

/** Whether a usable anon key has been provided. */
export function hasConfiguredKey(): boolean {
  return Boolean(readSettings().supabaseAnonKey);
}

/**
 * Supabase client bootstrap.
 *
 * The SDK is imported dynamically, so a demo/local install never downloads it
 * and the app stays fully usable with no credentials at all. Only the anon key
 * is ever present client-side — Row Level Security does the enforcement.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export function readCloudConfig(): CloudConfig | null {
  const mode = import.meta.env.VITE_APP_MODE;
  if (mode === 'local') return null;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!/^https?:\/\//.test(url)) return null;
  // Supabase anon keys are JWT tokens starting with 'ey'
  if (!anonKey.startsWith('ey')) return null;

  return { url, anonKey };
}

export function isCloudModeEnabled(): boolean {
  return readCloudConfig() !== null;
}

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** Lazily construct (once) the shared Supabase client. */
export function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = readCloudConfig();
  if (!config) return Promise.resolve(null);

  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(config.url, config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          global: {
            headers: { 'x-application-name': 'classora' },
          },
        }),
      )
      .catch(() => null);
  }

  return clientPromise;
}

/** Test helper: forget the memoised client. */
export function resetSupabaseClient(): void {
  clientPromise = null;
}

/** Human-readable error text for the toast layer. */
export function describeCloudError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Cloud request failed';
}

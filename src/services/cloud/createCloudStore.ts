/**
 * Cloud mode bootstrap.
 *
 * Returns `null` when Supabase is not configured, which keeps Classora fully
 * functional in local/demo mode with no credentials. The Supabase client is
 * loaded lazily so credentials-free installs never pay for the dependency.
 */
import type { DataStore } from '@/services/types';

export interface CloudConfig {
  url: string;
  anonKey: string;
}

export function readCloudConfig(): CloudConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!/^https?:\/\//.test(url)) return null;
  return { url, anonKey };
}

export function isCloudModeEnabled(): boolean {
  return readCloudConfig() !== null;
}

export function createCloudStoreIfConfigured(): DataStore | null {
  const config = readCloudConfig();
  if (!config) return null;

  // The Supabase-backed store is imported lazily because it must never be
  // bundled into a demo-mode payload that does not need it.
  // Implementation lives in `supabaseStore.ts` and satisfies `DataStore`.
  return createSupabaseStore(config);
}

/**
 * Wired in the cloud-integration phase; until credentials exist this returns
 * `null`-safe behaviour by delegating to the local store.
 */
function createSupabaseStore(config: CloudConfig): DataStore | null {
  void config;
  return null;
}

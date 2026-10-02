/**
 * Cloud mode bootstrap.
 *
 * Returns `null` when Supabase is not configured, which keeps Classora fully
 * functional in local/demo mode with no credentials at all. The Supabase SDK is
 * imported lazily inside the store, so credentials-free installs never pay for
 * the dependency.
 */
import type { DataStore } from '@/services/types';
import { readCloudConfig } from './client';
import { SupabaseStore } from './supabaseStore';

export { isCloudModeEnabled, readCloudConfig, type CloudConfig } from './client';

export function createCloudStoreIfConfigured(): DataStore | null {
  const config = readCloudConfig();
  if (!config) return null;
  return new SupabaseStore(config);
}

export { SupabaseStore };

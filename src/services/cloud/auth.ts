/**
 * Supabase auth for cloud mode.
 *
 * Kept behind a thin interface so screens never import the SDK. Sessions are
 * persisted by supabase-js itself; `getCurrentUser()` is safe to call before
 * any network is available and simply reports "signed out".
 */
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';

import { getSupabaseClient } from './client';

export interface CloudUser {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export function toCloudUser(user: User | null | undefined): CloudUser | null {
  if (!user) return null;
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  return {
    id: user.id,
    email: user.email ?? null,
    name: typeof metadata.full_name === 'string' ? metadata.full_name : (metadata.name as string) ?? null,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : null,
  };
}

export interface AuthResult {
  ok: boolean;
  user: CloudUser | null;
  message?: string;
}

/**
 * Auth built on a real client. Every method returns a result object rather
 * than throwing, because the UI must be able to show a friendly message.
 */
export function createAuth(client: SupabaseClient) {
  const currentUser = async (): Promise<CloudUser | null> => {
    try {
      const { data } = await client.auth.getUser();
      return toCloudUser(data.user);
    } catch {
      return null;
    }
  };

  return {
    async signIn(email: string, password: string): Promise<AuthResult> {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, user: null, message: error.message };
      return { ok: true, user: toCloudUser(data.user) };
    },

    async signUp(
      email: string,
      password: string,
      name: string,
    ): Promise<AuthResult & { needsEmailConfirmation: boolean }> {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        },
      });
      if (error) return { ok: false, user: null, message: error.message, needsEmailConfirmation: false };
      // With email confirmation enabled Supabase returns a user but no session.
      return {
        ok: true,
        user: toCloudUser(data.user),
        needsEmailConfirmation: data.session === null,
      };
    },

    async signInWithMagicLink(email: string): Promise<AuthResult> {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined;
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
        },
      });
      if (error) return { ok: false, user: null, message: error.message };
      return { ok: true, user: null };
    },

    async signOut(): Promise<void> {
      await client.auth.signOut();
    },

    async currentUser(): Promise<CloudUser | null> {
      return currentUser();
    },

    async session(): Promise<Session | null> {
      const { data } = await client.auth.getSession();
      return data.session;
    },

    /** Subscribe to sign-in / sign-out. Returns an unsubscribe function. */
    onChange(listener: (user: CloudUser | null) => void): () => void {
      const { data } = client.auth.onAuthStateChange((_event, session) => {
        listener(toCloudUser(session?.user));
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

export type CloudAuth = ReturnType<typeof createAuth>;

/** Lazily-created auth bound to the shared client. */
export async function loadAuth(): Promise<CloudAuth | null> {
  const client = await getSupabaseClient();
  return client ? createAuth(client) : null;
}

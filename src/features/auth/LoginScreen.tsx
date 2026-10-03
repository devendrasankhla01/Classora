import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { loadAuth, type AuthResult } from '@/services/cloud/auth';
import { isCloudModeEnabled } from '@/services/cloud/client';
import { Card } from '@/components/ui/Card';
import { Button, Field, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';

/**
 * Session storage key for the local/demo gate.
 *
 * When Supabase credentials are configured (`VITE_SUPABASE_URL` +
 * `VITE_SUPABASE_ANON_KEY`), the real Supabase session is the source of truth
 * and this key is only used if the student explicitly chooses "Skip for now".
 * When credentials are absent, signing in creates a local session record here
 * and patches the local profile so the student's name and email appear across
 * the app.
 */
export const AUTH_STORAGE_KEY = 'classora.auth.session.v1';

export interface StoredAuthSession {
  mode: 'cloud' | 'local' | 'guest';
  email: string | null;
  name: string | null;
  studentId: string | null;
  signedInAt: string;
}

export function readStoredSession(): StoredAuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (!parsed || typeof parsed !== 'object' || !parsed.mode) return null;
    return {
      mode: parsed.mode,
      email: parsed.email ?? null,
      name: parsed.name ?? null,
      studentId: parsed.studentId ?? null,
      signedInAt: parsed.signedInAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeStoredSession(session: StoredAuthSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!session) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new CustomEvent('classora:auth-change'));
  } catch {
    // Storage quota or private-mode restriction — ignore cleanly.
  }
}

/** Clear both any Supabase session and the local session record. */
export async function signOutEverywhere(): Promise<void> {
  const auth = await loadAuth();
  if (auth) {
    await auth.signOut();
  }
  writeStoredSession(null);
}

type AuthTab = 'signin' | 'signup' | 'magic';

/**
 * Compulsory entry gate (Option B).
 *
 * Supports:
 *   - Sign in with email + password
 *   - Create an account (name, college email, optional roll/ID, password)
 *   - Passwordless magic link
 *   - "Skip for now · Continue on this device" so a student without credentials
 *     is never locked out of their timetable
 *
 * When Supabase is configured (`isCloudModeEnabled()`), calls go through
 * `loadAuth()` (real Supabase Auth). Otherwise the form completes locally,
 * updates the active `Profile`, and persists the session in `localStorage`.
 */
export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useClassora((state) => state.profile);
  const updateProfile = useClassora((state) => state.updateProfile);
  const announce = useClassora((state) => state.announce);

  const cloudEnabled = isCloudModeEnabled();
  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/';

  const [tab, setTab] = useState<AuthTab>('signin');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(profile?.name ?? '');
  const [studentId, setStudentId] = useState(profile?.studentId ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [alreadySignedIn, setAlreadySignedIn] = useState< boolean >(() => readStoredSession() !== null);

  // If a real Supabase session already exists, mirror it and move on.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const auth = await loadAuth();
      if (!auth || cancelled) return;
      const user = await auth.currentUser();
      if (user && !cancelled) {
        writeStoredSession({
          mode: 'cloud',
          email: user.email,
          name: null,
          studentId: null,
          signedInAt: new Date().toISOString(),
        });
        setAlreadySignedIn(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (alreadySignedIn) {
    return <Navigate to={redirectTo} replace />;
  }

  function resetFeedback() {
    setError(null);
    setNotice(null);
  }

  function switchTab(next: AuthTab) {
    setTab(next);
    resetFeedback();
  }

  function deriveDisplayName(rawEmail: string, explicitName: string): string {
    const trimmed = explicitName.trim();
    if (trimmed.length > 0) return trimmed;
    const local = rawEmail.split('@')[0] ?? 'Student';
    return local
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  async function finishLocalSignIn(opts: {
    mode: StoredAuthSession['mode'];
    email: string | null;
    name?: string;
    studentId?: string;
    greeting: string;
  }) {
    if (opts.email || opts.name || opts.studentId) {
      await updateProfile({
        email: opts.email ?? profile?.email ?? null,
        name: opts.name && opts.name.trim().length > 0 ? opts.name.trim() : profile?.name ?? 'Student',
        studentId:
          opts.studentId && opts.studentId.trim().length > 0
            ? opts.studentId.trim()
            : profile?.studentId ?? null,
      });
    }
    writeStoredSession({
      mode: opts.mode,
      email: opts.email,
      name: opts.name ?? profile?.name ?? null,
      studentId: opts.studentId ?? profile?.studentId ?? null,
      signedInAt: new Date().toISOString(),
    });
    announce({ message: opts.greeting, tone: 'success' });
    navigate(redirectTo, { replace: true });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    resetFeedback();

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (tab !== 'magic' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (tab === 'signup' && name.trim().length < 2) {
      setError('Enter your full name so your attendance report stays labelled.');
      return;
    }

    setBusy(true);
    try {
      const auth = await loadAuth();

      // 1. Real Supabase flow when configured.
      if (auth) {
        const displayName = deriveDisplayName(cleanEmail, name);
        let result: AuthResult & { needsEmailConfirmation?: boolean };
        if (tab === 'signin') {
          result = await auth.signIn(cleanEmail, password);
        } else if (tab === 'signup') {
          result = await auth.signUp(cleanEmail, password, displayName);
        } else {
          result = await auth.signInWithMagicLink(cleanEmail);
        }

        if (!result.ok) {
          setError(result.message ?? 'Could not sign in. Check your details and try again.');
          return;
        }

        if (tab === 'magic') {
          setNotice(`Sign-in link sent to ${cleanEmail}. Open it on this device to finish.`);
          return;
        }

        if (result.needsEmailConfirmation) {
          setNotice(
            `Check ${cleanEmail} to confirm your account, then sign in with your password.`,
          );
          setTab('signin');
          return;
        }

        const resolvedName =
          result.user?.name && result.user.name.trim().length > 0
            ? result.user.name.trim()
            : tab === 'signup' && displayName
              ? displayName
              : profile?.name && profile.name !== 'Student'
                ? profile.name
                : deriveDisplayName(cleanEmail, '');

        await finishLocalSignIn({
          mode: 'cloud',
          email: cleanEmail,
          name: resolvedName,
          studentId: tab === 'signup' && studentId ? studentId : profile?.studentId ?? undefined,
          greeting: `Signed in as ${resolvedName}`,
        });
        return;
      }

      // 2. Device-local flow when Supabase isn't wired yet.
      if (tab === 'magic') {
        const displayName = deriveDisplayName(cleanEmail, name);
        await finishLocalSignIn({
          mode: 'local',
          email: cleanEmail,
          name: displayName,
          greeting: `Signed in as ${displayName}`,
        });
        return;
      }

      const displayName = deriveDisplayName(cleanEmail, name);
      await finishLocalSignIn({
        mode: 'local',
        email: cleanEmail,
        name: displayName,
        studentId: tab === 'signup' ? studentId : undefined,
        greeting:
          tab === 'signup'
            ? `Welcome to Classora, ${displayName.split(' ')[0]}`
            : `Welcome back, ${displayName.split(' ')[0]}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGuestContinue() {
    resetFeedback();
    await finishLocalSignIn({
      mode: 'guest',
      email: profile?.email ?? null,
      greeting: 'Continuing on this device',
    });
  }

  return (
    <div className="min-h-dvh bg-canvas px-5 pb-12 pt-safe-plus-4">
      <div className="mx-auto flex w-full max-w-app flex-col justify-between">
        {/* Brand header ------------------------------------------------- */}
        <header className="flex flex-col items-center pt-4 text-center">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-[20px] bg-surface shadow-elevated ring-1 ring-hairline">
            <img
              src="/icons/icon-192.png"
              alt="Classora"
              className="h-14 w-14 object-contain"
            />
          </div>

          <img
            src="/branding/wordmark.png"
            alt="Classora"
            className="mt-3.5 h-[22px] w-auto select-none object-contain"
          />

          <h1 className="mt-3 text-headline-md">
            {tab === 'signup'
              ? 'Create your student account'
              : tab === 'magic'
                ? 'Sign in with a magic link'
                : 'Welcome back'}
          </h1>
          <p className="mt-1 max-w-[30ch] text-body-md text-ink-secondary">
            Track every lecture, guard your 75% benchmark, and know cleanly when you can skip.
          </p>

          <div className="mt-3">
            <StatusChip
              tone={cloudEnabled ? 'safe' : 'brand'}
              label={cloudEnabled ? 'Cloud Sync Active' : 'On-Device Mode • Offline Ready'}
            />
          </div>
        </header>

        {/* Auth card ---------------------------------------------------- */}
        <Card className="mt-6">
          {/* Segmented mode switcher */}
          <div
            role="tablist"
            aria-label="Sign-in method"
            className="grid grid-cols-3 rounded-pill bg-surface-sunken p-1"
          >
            {(
              [
                { id: 'signin', label: 'Sign In' },
                { id: 'signup', label: 'Create' },
                { id: 'magic', label: 'Magic Link' },
              ] as const
            ).map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchTab(item.id)}
                  className={cn(
                    'min-h-9 rounded-pill text-label-md transition-all duration-200 ease-porcelain',
                    active
                      ? 'bg-ink text-white shadow-ambient'
                      : 'text-ink-secondary hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-3.5" noValidate>
            {tab === 'signup' ? (
              <Field label="Full name">
                <TextInput
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Aarav Sharma"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </Field>
            ) : null}

            <Field label="College or personal email">
              <TextInput
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@college.edu"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>

            {tab === 'signup' ? (
              <Field label="Roll / Student ID" hint="Optional">
                <TextInput
                  type="text"
                  name="studentId"
                  placeholder="2024CS1042"
                  value={studentId}
                  onChange={(event) => setStudentId(event.target.value)}
                />
              </Field>
            ) : null}

            {tab !== 'magic' ? (
              <Field
                label="Password"
                hint={tab === 'signup' ? '6+ chars' : undefined}
              >
                <div className="relative">
                  <TextInput
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete={tab === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-pill text-ink-secondary hover:text-ink"
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                  </button>
                </div>
              </Field>
            ) : (
              <p className="rounded-block bg-surface-muted px-3.5 py-2.5 text-body-sm text-ink-secondary">
                {cloudEnabled
                  ? 'We will email a one-tap sign-in link. No password needed.'
                  : 'Instant passwordless sign-in for this device. Add Supabase keys anytime to enable email links.'}
              </p>
            )}

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-block bg-critical-500/[0.12] px-3.5 py-2.5 text-body-sm text-critical-700"
              >
                <Icon name="error" size={18} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {notice ? (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-block bg-safe-500/[0.12] px-3.5 py-2.5 text-body-sm text-safe-700"
              >
                <Icon name="check_circle" size={18} className="mt-0.5 shrink-0" />
                <span>{notice}</span>
              </div>
            ) : null}

            <div className="pt-1">
              <Button
                type="submit"
                variant="primary"
                block
                disabled={busy}
                trailingIcon="arrow_forward"
              >
                {busy
                  ? 'Signing in…'
                  : tab === 'signup'
                    ? 'Create Account'
                    : tab === 'magic'
                      ? cloudEnabled
                        ? 'Send Magic Link'
                        : 'Continue with Email'
                      : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-divider" />
            <span className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">or</span>
            <span className="h-px flex-1 bg-divider" />
          </div>

          <Button
            type="button"
            variant="secondary"
            block
            icon="smartphone"
            onClick={() => void handleGuestContinue()}
          >
            Skip for now • Use on this device
          </Button>
        </Card>

        {/* Footer reassurance ------------------------------------------ */}
        <footer className="mt-6 space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 text-label-md text-ink-secondary">
            <Icon name="verified_user" size={16} className="text-safe-600" />
            <span>Attendance data is stored on your device first</span>
          </div>
          <p className="text-label-sm text-ink-muted">
            Classora • Porcelain Minimalist • Build 1.0
          </p>
        </footer>
      </div>
    </div>
  );
}

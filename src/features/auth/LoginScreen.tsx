import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { loadAuth, type AuthResult } from '@/services/cloud/auth';
import {
  findStudentByUsn,
  generateBuiltinSemester3Data,
} from '@/services/usnTimetable';
import { Card } from '@/components/ui/Card';
import { Button, Field, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/BrandLogo';

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
    // Storage restriction — ignore cleanly.
  }
}

export async function signOutEverywhere(): Promise<void> {
  const auth = await loadAuth();
  if (auth) {
    await auth.signOut();
  }
  writeStoredSession(null);
}

type AuthTab = 'signin' | 'signup';

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useClassora((state) => state.profile);
  const updateProfile = useClassora((state) => state.updateProfile);
  const applyImportedTimetable = useClassora((state) => state.applyImportedTimetable);
  const announce = useClassora((state) => state.announce);

  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/';

  const [tab, setTab] = useState<AuthTab>('signin');
  const [usnInput, setUsnInput] = useState(profile?.studentId ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [alreadySignedIn, setAlreadySignedIn] = useState<boolean>(() => readStoredSession() !== null);

  // Real-time student lookup by USN
  const detectedStudent = findStudentByUsn(usnInput);

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

  async function finishStudentSession(opts: {
    mode: StoredAuthSession['mode'];
    email: string;
    name: string;
    studentId: string;
    batch: 'A1' | 'A2';
    section: string;
    greeting: string;
  }) {
    // 1. Update Profile in Store / Database
    await updateProfile({
      email: opts.email,
      name: opts.name,
      studentId: opts.studentId,
      department: 'Computer Science & Engineering',
      departmentLabel: opts.section,
      semesterLabel: 'Semester III',
      batchRoll: opts.studentId,
    });

    // 2. Automatically generate & apply Batch A1 or Batch A2 timetable
    const builtinData = generateBuiltinSemester3Data('sem-iii-2026', opts.batch);
    await applyImportedTimetable({
      subjects: builtinData.subjects,
      slots: builtinData.slots,
      notes: builtinData.notes,
    });

    // 3. Write Session
    writeStoredSession({
      mode: opts.mode,
      email: opts.email,
      name: opts.name,
      studentId: opts.studentId,
      signedInAt: new Date().toISOString(),
    });

    await useClassora.getState().initialize();
    announce({
      message: `Welcome ${opts.name.split(' ')[0]}! Timetable auto-loaded for ${opts.section}`,
      tone: 'success',
    });
    navigate(redirectTo, { replace: true });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    resetFeedback();

    const cleanInput = usnInput.trim().toUpperCase();
    if (!cleanInput) {
      setError('Please enter your University Serial Number (USN).');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);

    try {
      const student = findStudentByUsn(cleanInput);
      const studentUsn = student ? student.usn : cleanInput;
      const studentName = student ? student.name : `Student ${cleanInput}`;
      const studentBatch = student ? student.batch : 'A2';
      const studentSection = student ? student.section : 'CSE • Section A';

      // Auto-derived clean email format for Supabase auth
      const derivedEmail = cleanInput.includes('@')
        ? cleanInput.toLowerCase()
        : `${cleanInput.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.edu`;

      const auth = await loadAuth();

      // 1. Cloud Mode (Supabase Auth)
      if (auth) {
        let result: AuthResult & { needsEmailConfirmation?: boolean };
        if (tab === 'signin') {
          result = await auth.signIn(derivedEmail, password);
        } else {
          result = await auth.signUp(derivedEmail, password, studentName);
        }

        if (!result.ok) {
          setError(result.message ?? 'Could not authenticate. Check your USN & password and try again.');
          return;
        }

        if (result.needsEmailConfirmation) {
          setNotice(`Confirmation link sent to ${derivedEmail}. Confirm to finish, or sign in below.`);
          setTab('signin');
          return;
        }

        await finishStudentSession({
          mode: 'cloud',
          email: derivedEmail,
          name: studentName,
          studentId: studentUsn,
          batch: studentBatch,
          section: studentSection,
          greeting: `Welcome back ${studentName}!`,
        });
        return;
      }

      // 2. Local Mode (Device Local Auth)
      await finishStudentSession({
        mode: 'local',
        email: derivedEmail,
        name: studentName,
        studentId: studentUsn,
        batch: studentBatch,
        section: studentSection,
        greeting: `Welcome ${studentName}!`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGuestContinue() {
    resetFeedback();
    const guestStudent = findStudentByUsn(usnInput) || {
      usn: '4PM25CS043',
      name: 'DEVENDRA SANKHLA',
      batch: 'A2' as const,
      section: 'CSE • Section A (Batch A-2)',
    };

    await finishStudentSession({
      mode: 'guest',
      email: `${guestStudent.usn.toLowerCase()}@college.edu`,
      name: guestStudent.name,
      studentId: guestStudent.usn,
      batch: guestStudent.batch,
      section: guestStudent.section,
      greeting: 'Continuing on this device',
    });
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 pb-12 pt-safe-plus-4 flex flex-col justify-between items-center">
      <div className="mx-auto flex w-full max-w-app flex-col justify-between">
        {/* Brand header */}
        <header className="flex flex-col items-center pt-4 text-center">
          <BrandLogo variant="horizontal" size="lg" className="mb-2" />
          <h1 className="mt-2 text-headline-md font-bold text-slate-900">
            {tab === 'signup' ? 'Create Student Account' : 'Student Sign In'}
          </h1>
          <p className="mt-1 max-w-[32ch] text-body-sm text-ink-secondary">
            Section A CSE Timetable & Attendance Assistant
          </p>
        </header>

        {/* Auth card */}
        <Card className="mt-6 glass-card-elevated p-5 sm:p-6 shadow-xl border border-white/80">
          {/* Segmented switcher: Sign In vs Create Account */}
          <div
            role="tablist"
            aria-label="Sign-in method"
            className="grid grid-cols-2 rounded-full bg-slate-200/70 p-1 border border-slate-300/40"
          >
            {(
              [
                { id: 'signin', label: 'Sign In' },
                { id: 'signup', label: 'Create Account' },
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
                    'min-h-9 rounded-full text-label-md font-bold transition-all duration-200',
                    active
                      ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-md'
                      : 'text-ink-secondary hover:text-ink',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={(event) => void handleSubmit(event)} className="mt-5 space-y-4" noValidate>
            <Field
              label={tab === 'signup' ? 'University Serial Number (USN)' : 'USN or Email'}
              hint="e.g. 4PM25CS043 or 4PM25CS001"
            >
              <TextInput
                type="text"
                name="usn"
                autoComplete="username"
                placeholder="4PM25CS043"
                value={usnInput}
                onChange={(event) => setUsnInput(event.target.value.toUpperCase())}
                required
              />

              {/* Real-time student recognition badge */}
              {detectedStudent ? (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-emerald-300/80 bg-emerald-50/90 p-3 text-label-sm font-semibold text-emerald-900 shadow-sm animate-fade-in">
                  <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <span className="block font-bold text-emerald-950">{detectedStudent.name}</span>
                    <span className="block text-[11px] text-emerald-800 font-medium mt-0.5">
                      {detectedStudent.section} • Timetable ready to auto-allocate
                    </span>
                  </div>
                </div>
              ) : null}
            </Field>

            <Field label="Password" hint={tab === 'signup' ? 'At least 6 characters' : undefined}>
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
                  className="absolute inset-y-0 right-1 grid w-10 place-items-center rounded-full text-slate-400 hover:text-slate-600"
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} size={18} />
                </button>
              </div>
            </Field>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-body-sm font-medium text-red-700"
              >
                <Icon name="error" size={18} className="mt-0.5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            ) : null}

            {notice ? (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-body-sm font-medium text-emerald-700"
              >
                <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-emerald-600" />
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
                  ? 'Verifying…'
                  : tab === 'signup'
                    ? 'Create Account & Auto-Load Schedule'
                    : 'Sign In'}
              </Button>
            </div>
          </form>

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

        {/* Footer */}
        <footer className="mt-6 space-y-2 text-center">
          <div className="inline-flex items-center gap-1.5 text-label-md text-ink-secondary">
            <Icon name="verified_user" size={16} className="text-emerald-600" />
            <span>Official Section A 3rd Sem Roster Integrated</span>
          </div>
          <div className="flex items-center justify-center gap-3 text-label-sm text-ink-muted">
            <span>CampusOne • Build 1.0</span>
            <span>•</span>
            <a href="/admin" className="font-semibold text-brand-600 hover:underline">
              Admin Portal
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { loadAuth, type AuthResult } from '@/services/cloud/auth';
import { findStudentByUsn } from '@/services/usnTimetable';
import { Card } from '@/components/ui/Card';
import { Button, Field, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { BrandLogo } from '@/components/ui/BrandLogo';

export const AUTH_STORAGE_KEY = 'classora.auth.session.v1';

export type UserRole = 'student' | 'faculty' | 'hod' | 'principal';

export interface StoredAuthSession {
  mode: 'cloud' | 'local' | 'guest';
  role: UserRole;
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
      role: parsed.role ?? 'student',
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

interface RoleConfig {
  id: UserRole;
  label: string;
  shortLabel: string;
  icon: string;
  activeColor: string;
  badgeBg: string;
  badgeText: string;
  inputLabel: string;
  inputHint: string;
  inputPlaceholder: string;
  btnLabel: string;
  demoId: string;
  demoPass: string;
}

const ROLES: RoleConfig[] = [
  {
    id: 'student',
    label: 'Student',
    shortLabel: 'Student',
    icon: 'school',
    activeColor: 'from-indigo-600 to-indigo-700 text-white shadow-md',
    badgeBg: 'bg-indigo-50 border-indigo-200/80',
    badgeText: 'text-indigo-900',
    inputLabel: 'University Serial Number (USN)',
    inputHint: 'e.g. 4PM25XX000',
    inputPlaceholder: '4PM25XX000',
    btnLabel: 'Sign In as Student',
    demoId: '4PM25CS043',
    demoPass: 'Dev@123',
  },
  {
    id: 'faculty',
    label: 'Faculty',
    shortLabel: 'Faculty',
    icon: 'badge',
    activeColor: 'from-emerald-600 to-emerald-700 text-white shadow-md',
    badgeBg: 'bg-emerald-50 border-emerald-200/80',
    badgeText: 'text-emerald-900',
    inputLabel: 'Faculty ID or College Email',
    inputHint: 'e.g. FAC-CSE-01 or faculty@college.edu',
    inputPlaceholder: 'FAC-CSE-01',
    btnLabel: 'Sign In as Faculty',
    demoId: 'FAC-CSE-01',
    demoPass: 'Faculty@123',
  },
  {
    id: 'hod',
    label: 'HOD',
    shortLabel: 'HOD',
    icon: 'account_tree',
    activeColor: 'from-purple-600 to-purple-700 text-white shadow-md',
    badgeBg: 'bg-purple-50 border-purple-200/80',
    badgeText: 'text-purple-900',
    inputLabel: 'Department HOD ID or Email',
    inputHint: 'e.g. HOD-CSE-01 or hod.cse@college.edu',
    inputPlaceholder: 'HOD-CSE-01',
    btnLabel: 'Sign In as HOD',
    demoId: 'HOD-CSE-01',
    demoPass: 'Hod@123',
  },
  {
    id: 'principal',
    label: 'Principal',
    shortLabel: 'Principal',
    icon: 'assured_workload',
    activeColor: 'from-amber-600 to-amber-700 text-white shadow-md',
    badgeBg: 'bg-amber-50 border-amber-200/80',
    badgeText: 'text-amber-900',
    inputLabel: 'Principal / Admin ID',
    inputHint: 'e.g. PRIN-001 or Dev123',
    inputPlaceholder: 'PRIN-001',
    btnLabel: 'Sign In to Admin Portal',
    demoId: 'Dev123',
    demoPass: 'Dev@2026',
  },
];

const FACULTY_ROSTER: Record<string, { name: string; dept: string; subjects: string }> = {
  'FAC-CSE-01': { name: 'Mrs Manjula H', dept: 'Computer Science & Eng.', subjects: 'OOPS & OOPS Lab' },
  'FAC-CSE-02': { name: 'Ms Vinutha H M', dept: 'Computer Science & Eng.', subjects: 'Data Structures & DS Lab' },
  'FAC-CSE-03': { name: 'Mr Rajesh T H', dept: 'Computer Science & Eng.', subjects: 'Git & GitHub Lab' },
  'FAC-CSE-04': { name: 'Mr. Maruthi S T', dept: 'Computer Science & Eng.', subjects: 'Operating Systems & Comm. Proj' },
  'FAC-CSE-05': { name: 'Ms Vandana shetty', dept: 'Mathematics Dept.', subjects: 'Mathematics III' },
  'FAC-CSE-06': { name: 'Mrs. Yashaswini N G', dept: 'Computer Science & Eng.', subjects: 'DDCO' },
};

const HOD_ROSTER: Record<string, { name: string; dept: string }> = {
  'HOD-CSE-01': { name: 'Dr. K. Verma', dept: 'Head of Computer Science & Engineering' },
  'HOD-ECE-01': { name: 'Dr. P. Sharma', dept: 'Head of Electronics & Comm. Eng.' },
  'HOD-MECH-01': { name: 'Dr. R. Naik', dept: 'Head of Mechanical Engineering' },
};

export function LoginScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useClassora((state) => state.profile);
  const updateProfile = useClassora((state) => state.updateProfile);
  const announce = useClassora((state) => state.announce);

  const redirectTo =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/';

  const [role, setRole] = useState<UserRole>('student');
  const [tab, setTab] = useState<AuthTab>('signin');
  const [idInput, setIdInput] = useState(profile?.studentId ?? '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [alreadySignedIn, setAlreadySignedIn] = useState<boolean>(() => readStoredSession() !== null);

  const currentRoleConfig = ROLES.find((r) => r.id === role)!;

  // Live Recognition Lookup based on active role
  const cleanId = idInput.trim().toUpperCase();
  const detectedStudent = role === 'student' ? findStudentByUsn(cleanId) : null;
  const detectedFaculty = role === 'faculty' ? (FACULTY_ROSTER[cleanId] ?? (cleanId.includes('@') || cleanId.startsWith('FAC') ? { name: `Prof. ${idInput.split('@')[0]}`, dept: 'Computer Science & Eng.', subjects: 'Faculty Lectures' } : null)) : null;
  const detectedHOD = role === 'hod' ? (HOD_ROSTER[cleanId] ?? (cleanId.includes('@') || cleanId.startsWith('HOD') ? { name: `Dr. ${idInput.split('@')[0]}`, dept: 'Head of Department' } : null)) : null;
  const detectedPrincipal = role === 'principal' ? (cleanId === 'DEV123' || cleanId === 'PRIN-001' || cleanId.includes('PRINCIPAL') ? { name: 'Dr. Admin Principal', dept: 'Principal & Institutional Head' } : null) : null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const auth = await loadAuth();
      if (!auth || cancelled) return;
      const user = await auth.currentUser();
      if (user && !cancelled) {
        writeStoredSession({
          mode: 'cloud',
          role: 'student',
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

  function handleRoleChange(newRole: UserRole) {
    setRole(newRole);
    resetFeedback();
    const demo = ROLES.find((r) => r.id === newRole)!;
    setIdInput(demo.demoId);
    setPassword(demo.demoPass);
  }

  function switchTab(next: AuthTab) {
    setTab(next);
    resetFeedback();
  }

  async function finishSession(opts: {
    mode: StoredAuthSession['mode'];
    role: UserRole;
    email: string;
    name: string;
    studentId: string;
    departmentLabel: string;
    targetPath: string;
    greeting: string;
  }) {
    // 1. If Principal/Admin, set admin session flag
    if (opts.role === 'principal') {
      sessionStorage.setItem('classora_admin_auth_v1', 'true');
    }

    // 2. Write Session immediately
    writeStoredSession({
      mode: opts.mode,
      role: opts.role,
      email: opts.email,
      name: opts.name,
      studentId: opts.studentId,
      signedInAt: new Date().toISOString(),
    });

    // 3. Update Profile in Store / Database
    await updateProfile({
      email: opts.email,
      name: opts.name,
      studentId: opts.studentId,
      department: 'Computer Science & Engineering',
      departmentLabel: opts.departmentLabel,
      semesterLabel: opts.role === 'student' ? 'Semester III' : `${opts.role.toUpperCase()} Portal`,
      batchRoll: opts.studentId,
    });

    // 4. Initialize store & announce welcome
    await useClassora.getState().initialize();
    announce({
      message: `${opts.greeting} (${opts.role.toUpperCase()} Portal)`,
      tone: 'success',
    });
    navigate(opts.targetPath, { replace: true });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    resetFeedback();

    if (!cleanId) {
      setError(`Please enter your ${currentRoleConfig.inputLabel}.`);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);

    try {
      // 1. Student Login
      if (role === 'student') {
        const student = findStudentByUsn(cleanId);
        const studentUsn = student ? student.usn : cleanId;
        const studentName = student ? student.name : `Student ${cleanId}`;
        const studentSection = student ? student.section : 'CSE • Section A';

        const derivedEmail = cleanId.includes('@')
          ? cleanId.toLowerCase()
          : `${cleanId.toLowerCase().replace(/[^a-z0-9]/g, '')}@college.edu`;

        const auth = await loadAuth();
        if (auth) {
          let result: AuthResult & { needsEmailConfirmation?: boolean };
          if (tab === 'signin') {
            result = await auth.signIn(derivedEmail, password);
          } else {
            result = await auth.signUp(derivedEmail, password, studentName);
          }

          if (!result.ok) {
            setError(result.message ?? 'Could not authenticate. Check credentials and try again.');
            return;
          }

          if (result.needsEmailConfirmation) {
            setNotice(`Confirmation link sent to ${derivedEmail}. Confirm to finish.`);
            setTab('signin');
            return;
          }

          await finishSession({
            mode: 'cloud',
            role: 'student',
            email: derivedEmail,
            name: studentName,
            studentId: studentUsn,
            departmentLabel: studentSection,
            targetPath: redirectTo,
            greeting: `Welcome back ${studentName.split(' ')[0]}!`,
          });
          return;
        }

        await finishSession({
          mode: 'local',
          role: 'student',
          email: derivedEmail,
          name: studentName,
          studentId: studentUsn,
          departmentLabel: studentSection,
          targetPath: redirectTo,
          greeting: `Welcome ${studentName.split(' ')[0]}!`,
        });
        return;
      }

      // 2. Faculty Login
      if (role === 'faculty') {
        const facultyInfo = detectedFaculty ?? { name: `Prof. ${cleanId}`, dept: 'Computer Science & Eng.' };
        await finishSession({
          mode: 'local',
          role: 'faculty',
          email: `${cleanId.toLowerCase()}@college.edu`,
          name: facultyInfo.name,
          studentId: cleanId,
          departmentLabel: 'Faculty • CSE Department',
          targetPath: '/timetable',
          greeting: `Welcome ${facultyInfo.name}!`,
        });
        return;
      }

      // 3. HOD Login
      if (role === 'hod') {
        const hodInfo = detectedHOD ?? { name: `Dr. ${cleanId}`, dept: 'Head of Department' };
        await finishSession({
          mode: 'local',
          role: 'hod',
          email: `${cleanId.toLowerCase()}@college.edu`,
          name: hodInfo.name,
          studentId: cleanId,
          departmentLabel: 'HOD • Computer Science & Eng.',
          targetPath: '/analytics',
          greeting: `Welcome ${hodInfo.name}!`,
        });
        return;
      }

      // 4. Principal / Admin Login
      if (role === 'principal') {
        const principalInfo = detectedPrincipal ?? { name: 'Dr. Admin Principal', dept: 'Principal & Institutional Head' };
        await finishSession({
          mode: 'local',
          role: 'principal',
          email: 'principal@college.edu',
          name: principalInfo.name,
          studentId: 'PRIN-001',
          departmentLabel: 'Principal • Institute Admin',
          targetPath: '/admin',
          greeting: `Welcome Principal Admin!`,
        });
        return;
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-canvas px-4 pb-12 pt-safe-plus-4 flex flex-col justify-between items-center select-none">
      <div className="mx-auto flex w-full max-w-app flex-col justify-between">
        {/* Brand header */}
        <header className="flex flex-col items-center pt-4 text-center">
          <BrandLogo variant="horizontal" size="lg" className="mb-2" />
          <h1 className="mt-2 text-headline-md sm:text-headline-lg font-extrabold text-slate-900 tracking-tight">
            CampusOne Institutional Portal
          </h1>
          <p className="mt-1 max-w-[34ch] text-body-sm text-slate-500 font-medium">
            Multi-Role Academic Timetable & Attendance System
          </p>
        </header>

        {/* Auth Card */}
        <Card className="mt-5 glass-card-elevated p-5 sm:p-6 shadow-xl border border-white/90">
          {/* 4-Way Role Switcher Bar */}
          <div className="space-y-1.5 mb-5">
            <p className="text-label-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Select Your Portal Role:
            </p>
            <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-200/80 p-1.5 border border-slate-300/50 shadow-inner">
              {ROLES.map((r) => {
                const active = role === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    className={cn(
                      'flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200',
                      active
                        ? `bg-gradient-to-r ${r.activeColor}`
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50',
                    )}
                  >
                    <Icon name={r.icon} size={18} className={active ? 'text-white' : ''} />
                    <span className="text-[11px] font-extrabold mt-1 tracking-tight">
                      {r.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Segmented Switcher: Sign In vs Create Account (For Student / Faculty) */}
          <div
            role="tablist"
            aria-label="Sign-in method"
            className="grid grid-cols-2 rounded-full bg-slate-200/60 p-1 border border-slate-300/40 mb-4"
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
                      : 'text-slate-500 hover:text-slate-900',
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Main Form */}
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4" noValidate>
            <Field
              label={currentRoleConfig.inputLabel}
              hint={currentRoleConfig.inputHint}
            >
              <TextInput
                type="text"
                name="identityInput"
                autoComplete="username"
                placeholder={currentRoleConfig.inputPlaceholder}
                value={idInput}
                onChange={(event) => setIdInput(event.target.value.toUpperCase())}
                required
              />

              {/* Real-time Recognition Badge for Student */}
              {role === 'student' && detectedStudent ? (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-emerald-300/80 bg-emerald-50/90 p-3 text-label-sm font-semibold text-emerald-900 shadow-sm animate-fade-in">
                  <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <span className="block font-bold text-emerald-950">{detectedStudent.name}</span>
                    <span className="block text-[11px] text-emerald-800 font-medium mt-0.5">
                      {detectedStudent.section} • Student Roster Recognized
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Real-time Recognition Badge for Faculty */}
              {role === 'faculty' && detectedFaculty ? (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-emerald-300/80 bg-emerald-50/90 p-3 text-label-sm font-semibold text-emerald-900 shadow-sm animate-fade-in">
                  <Icon name="verified" size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <span className="block font-bold text-emerald-950">{detectedFaculty.name}</span>
                    <span className="block text-[11px] text-emerald-800 font-medium mt-0.5">
                      {detectedFaculty.dept} • {detectedFaculty.subjects}
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Real-time Recognition Badge for HOD */}
              {role === 'hod' && detectedHOD ? (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-purple-300/80 bg-purple-50/90 p-3 text-label-sm font-semibold text-purple-900 shadow-sm animate-fade-in">
                  <Icon name="account_tree" size={18} className="mt-0.5 shrink-0 text-purple-600" />
                  <div>
                    <span className="block font-bold text-purple-950">{detectedHOD.name}</span>
                    <span className="block text-[11px] text-purple-800 font-medium mt-0.5">
                      {detectedHOD.dept} • Departmental Oversight Portal
                    </span>
                  </div>
                </div>
              ) : null}

              {/* Real-time Recognition Badge for Principal */}
              {role === 'principal' && detectedPrincipal ? (
                <div className="mt-2.5 flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/90 p-3 text-label-sm font-semibold text-amber-900 shadow-sm animate-fade-in">
                  <Icon name="assured_workload" size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <span className="block font-bold text-amber-950">{detectedPrincipal.name}</span>
                    <span className="block text-[11px] text-amber-800 font-medium mt-0.5">
                      {detectedPrincipal.dept} • Institute Administration
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
                {busy ? 'Verifying…' : currentRoleConfig.btnLabel}
              </Button>
            </div>
          </form>

          {/* Quick Demo Pre-fill Toolbar */}
          <div className="mt-5 pt-3 border-t border-slate-200/70 text-left">
            <p className="text-label-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Quick Role Test Credentials:
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoleChange(r.id)}
                  className={cn(
                    'py-1.5 px-2.5 rounded-xl text-[11px] font-bold text-left transition flex items-center justify-between border',
                    role === r.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100/80 text-slate-700 border-slate-200 hover:bg-slate-200/60',
                  )}
                >
                  <span className="truncate">{r.label}: {r.demoId}</span>
                  <Icon name="bolt" size={12} className="shrink-0 text-amber-500 ml-1" />
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Footer */}
        <footer className="mt-6 space-y-2 text-center">
          <div className="flex items-center justify-center gap-3 text-label-sm text-slate-500">
            <span>CampusOne • Build 1.0</span>
            <span>•</span>
            <a href="/admin" className="font-semibold text-indigo-600 hover:underline">
              Principal Admin Portal
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

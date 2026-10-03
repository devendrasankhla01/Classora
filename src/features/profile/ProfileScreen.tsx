import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { Avatar, IconTile, Stepper, Toggle } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/chips';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/controls';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import { signOutEverywhere } from '@/features/auth/LoginScreen';

/**
 * Profile — student identity, attendance policy, academic configuration,
 * reminders, device settings and data ownership.
 */
export function ProfileScreen() {
  const profile = useClassora((state) => state.profile);
  const semester = useClassora((state) => state.semester);
  const versions = useClassora((state) => state.versions);
  const preferences = useClassora((state) => state.preferences);
  const setAttendanceTarget = useClassora((state) => state.setAttendanceTarget);
  const setCountMode = useClassora((state) => state.setCountMode);
  const savePreferences = useClassora((state) => state.savePreferences);
  const confidence = useClassora((state) => state.confidence);
  const subjects = useActiveSubjects();
  const navigate = useNavigate();

  const [resetOpen, setResetOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const resetDemoData = useClassora((state) => state.resetDemoData);

  const currentVersion = versions.find((version) => version.isCurrent) ?? versions[0] ?? null;
  const target = profile?.attendanceTarget ?? 75;
  const countMode = profile?.defaultCountMode ?? 'period';

  return (
    <>
      <AppHeader title="Profile" />

      <div className="space-y-5 px-5">
        {/* Identity ---------------------------------------------------- */}
        <Card>
          <div className="flex flex-col items-center text-center">
            <Avatar name={profile?.name ?? 'Classora'} size={78} badge />
            <h2 className="mt-3 text-headline-md">
              {profile?.name ?? 'Student'}
            </h2>
            <p className="mt-0.5 text-body-md text-ink-secondary">
              {[semester?.name, profile?.departmentLabel].filter(Boolean).join(' • ')}
            </p>
            {profile?.studentId ? (
              <span className="mt-3 inline-flex items-center gap-2 rounded-pill bg-brand-50 px-3.5 py-1.5 text-label-md text-brand-700">
                <Icon name="badge" size={15} />
                ID: {profile.studentId}
              </span>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-2 divide-x divide-divider rounded-block border border-divider bg-surface-muted py-3.5">
            <div className="px-3.5 text-center">
              <p className="text-label-sm font-semibold text-ink-secondary">Semester Status</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-label-lg">
                <span className="h-2 w-2 rounded-full bg-safe-500" />
                Active • On Track
              </p>
            </div>
            <div className="px-3.5 text-center">
              <p className="text-label-sm font-semibold text-ink-secondary">Batch Roll</p>
              <p className="mt-1 text-label-lg">{profile?.batchRoll ?? '—'}</p>
            </div>
          </div>
        </Card>

        {/* Attendance targets & policy --------------------------------- */}
        <Section title="Attendance Targets & Policy">
          <Card className="!p-4">
            <Row
              icon="track_changes"
              tone="indigo"
              title="Target Threshold"
              subtitle="Minimum attendance you must maintain"
              trailing={
                <Stepper
                  label="attendance target"
                  value={target}
                  min={50}
                  max={95}
                  step={5}
                  format={(value) => `${value}%`}
                  onChange={(value) => void setAttendanceTarget(value)}
                />
              }
            />
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken">
              <div
                className="h-full rounded-pill bg-brand-600 transition-[width] duration-500 ease-porcelain"
                style={{ width: `${((target - 50) / 45) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-label-sm text-ink-muted">
              50% to 95% · different colleges require different minimums
            </p>
          </Card>

          <Card className="mt-2.5 !p-4">
            <Row
              icon="calculate"
              tone="sky"
              title="Calculation Rule"
              subtitle="How a subject's attendance is counted"
              trailing={<Pill tone="muted">{countMode === 'session' ? 'Session-based' : 'Period-based'}</Pill>}
            />
            <div className="mt-3 flex gap-2">
              <ModeButton
                active={countMode === 'period'}
                label="Individual periods"
                hint="A 2-period lab counts twice"
                onClick={() => void setCountMode('period')}
              />
              <ModeButton
                active={countMode === 'session'}
                label="One session"
                hint="A 2-period lab counts once"
                onClick={() => void setCountMode('session')}
              />
            </div>
            <p className="mt-2 text-label-sm text-ink-muted">
              Applies to every subject. Individual subjects can override this in Manage Subjects.
            </p>
          </Card>

          <Card className="mt-2.5 !p-4">
            <Row
              icon="shield"
              tone="amber"
              title="Safe Margin Alert"
              subtitle="Warn me before a subject slips below target"
              trailing={<Pill tone="muted">{profile?.safeMarginAlertClasses ?? 3} classes prior</Pill>}
            />
          </Card>
        </Section>

        {/* Academic architecture --------------------------------------- */}
        <Section title="Academic Architecture">
          <Card className="!p-4">
            <LinkRow
              icon="library_books"
              tone="indigo"
              title="Manage Subjects"
              subtitle="Syllabus codes, faculty and counting rules"
              trailing={`${subjects.length} Courses`}
              to="/profile/subjects"
            />
            <Divider />
            <LinkRow
              icon="schema"
              tone="violet"
              title="Timetable Versions"
              subtitle="Active schema registry"
              trailing={currentVersion ? `v${currentVersion.versionNumber}.0` : '—'}
              to="/timetable/versions"
            />
            <Divider />
            <LinkRow
              icon="event_available"
              tone="sky"
              title="Academic Calendar"
              subtitle="Holidays, working Saturdays and special slots"
              trailing="Configured"
              to="/timetable/calendar"
            />
          </Card>
        </Section>

        {/* Alerts ------------------------------------------------------ */}
        <Section title="Alerts & Reminders">
          <Card className="!p-4">
            <ToggleRow
              icon="notifications_active"
              tone="indigo"
              title="After-Class Reminders"
              subtitle={`Mark status ${preferences?.reminderDelayMinutes ?? 10} min after each lecture`}
              checked={preferences?.afterClassReminder ?? true}
              onChange={(value) => void savePreferences({ afterClassReminder: value })}
            />
            <ToggleRow
              icon="sync_alt"
              tone="sky"
              title="Schedule Changes"
              subtitle="Instant alert on classroom swaps"
              checked={preferences?.timetableChangeAlert ?? true}
              onChange={(value) => void savePreferences({ timetableChangeAlert: value })}
            />
            <ToggleRow
              icon="notification_important"
              tone="rose"
              title="Attendance Risk Alerts"
              subtitle={`Notify when a subject dips below ${target}%`}
              checked={preferences?.attendanceRiskAlert ?? true}
              onChange={(value) => void savePreferences({ attendanceRiskAlert: value })}
            />
            <Divider />
            <LinkRow
              icon="tune"
              tone="indigo"
              title="Reminder Settings"
              subtitle="Timing, back-to-back combining and working Saturdays"
              trailing="Open"
              to="/profile/notifications"
            />
          </Card>
        </Section>

        {/* Device & security ------------------------------------------ */}
        <Section title="Device & Security">
          <Card className="!p-4">
            <LinkRow
              icon="palette"
              tone="violet"
              title="Appearance"
              subtitle="Adaptive display engine"
              trailing="System (Light)"
              to="/settings"
            />
            <Divider />
            <LinkRow
              icon="cloud_sync"
              tone="indigo"
              title="Sync & Backup"
              subtitle={`Data confidence ${confidence()}%`}
              trailing="Synced"
              to="/settings"
            />
            <Divider />
            <LinkRow
              icon="ios_share"
              tone="sky"
              title="Export Attendance Report"
              subtitle="CSV statement or full JSON backup"
              trailing="Export"
              to="/settings/export"
            />
          </Card>
        </Section>

        <div className="space-y-2.5">
          {confirmLogout ? (
            <Card className="!p-4">
              <p className="text-label-lg">Log out of Classora?</p>
              <p className="mt-1 text-body-sm text-ink-secondary">
                Your data stays on this device. In demo mode you can return to the seeded dataset at any time.
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" block onClick={() => setConfirmLogout(false)}>
                  Stay
                </Button>
                <Button
                  variant="danger"
                  block
                  onClick={() => {
                    void (async () => {
                      await signOutEverywhere();
                      setConfirmLogout(false);
                      navigate('/login', { replace: true });
                    })();
                  }}
                >
                  Log out
                </Button>
              </div>
            </Card>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmLogout(true)}
className="flex w-full items-center justify-center gap-2 rounded-pill bg-critical-50 py-3.5 text-label-lg text-critical-600"
            >
              <Icon name="logout" size={18} />
              Log Out {profile?.name?.split(' ')[0] ?? ''}
            </button>
          )}

          <button
            type="button"
            onClick={() => setResetOpen(true)}
className="w-full rounded-pill py-3 text-label-md text-ink-muted"
          >
            Restore demo data
          </button>
        </div>

        <p className="pb-2 text-center text-label-sm text-ink-muted">
          Classora • Build 1.0.0 • {useClassora.getState().mode === 'local' ? 'Local mode' : 'Cloud mode'}
        </p>
      </div>

      <BottomSheet
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Restore demo data?"
        description="This replaces everything on this device with the seeded Semester 5 dataset. It cannot be undone."
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" block onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              block
              onClick={() => {
                setResetOpen(false);
                void resetDemoData();
              }}
            >
              Restore
            </Button>
          </div>
        }
      >
        <p className="pt-1 text-body-sm text-ink-secondary">
          Tip: export a JSON backup first if you want to keep your current records.
        </p>
      </BottomSheet>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 px-1 text-label-sm uppercase tracking-[0.03em] text-ink-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({
  icon,
  tone,
  title,
  subtitle,
  trailing,
}: {
  icon: string;
  tone: string;
  title: string;
  subtitle: string;
  trailing: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3.5">
      <IconTile icon={icon} tone={tone} size={40} iconSize={19} />
      <div className="min-w-0 flex-1">
        <p className="text-label-lg">{title}</p>
        <p className="mt-0.5 text-label-md text-ink-secondary">{subtitle}</p>
      </div>
      {trailing}
    </div>
  );
}

function LinkRow({
  icon,
  tone,
  title,
  subtitle,
  trailing,
  to,
}: {
  icon: string;
  tone: string;
  title: string;
  subtitle: string;
  trailing: string;
  to: string;
}) {
  return (
    <Link to={to} className="flex items-center gap-3.5 transition active:scale-[0.995]">
      <IconTile icon={icon} tone={tone} size={40} iconSize={19} />
      <div className="min-w-0 flex-1">
        <p className="text-label-lg">{title}</p>
        <p className="mt-0.5 truncate text-label-md text-ink-secondary">{subtitle}</p>
      </div>
      <span className="shrink-0 text-label-md text-ink-secondary">{trailing}</span>
      <Icon name="chevron_right" size={19} className="shrink-0 text-ink-muted" />
    </Link>
  );
}

function ToggleRow({
  icon,
  tone,
  title,
  subtitle,
  checked,
  onChange,
}: {
  icon: string;
  tone: string;
  title: string;
  subtitle: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3.5 py-1.5">
      <IconTile icon={icon} tone={tone} size={40} iconSize={19} />
      <div className="min-w-0 flex-1">
        <p className="text-label-lg">{title}</p>
        <p className="mt-0.5 text-label-md text-ink-secondary">{subtitle}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function Divider() {
  return <div className="my-3 h-px bg-divider" />;
}

function ModeButton({
  active,
  label,
  hint,
  onClick,
}: {
  active: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex-1 rounded-block border p-3 text-left transition',
        active ? 'border-brand-500 bg-brand-50/60' : 'border-edge bg-surface',
      )}
    >
      <span className={cn('block text-label-md', active ? 'text-brand-700' : 'text-ink')}>
        {label}
      </span>
      <span className="mt-0.5 block text-label-sm text-ink-secondary">{hint}</span>
    </button>
  );
}

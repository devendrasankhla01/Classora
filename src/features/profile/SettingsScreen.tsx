import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/chips';
import { useActiveSubjects } from '@/hooks/useClassoraData';
import { notifications } from '@/platform';

/**
 * Device & data settings: appearance, offline storage, sync and export.
 */
export function SettingsScreen() {
  const settings = useClassora((state) => state.settings);
  const saveSettings = useClassora((state) => state.saveSettings);
  const syncState = useClassora((state) => state.syncState);
  const confidence = useClassora((state) => state.confidence);
  const subjects = useActiveSubjects();
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const announce = useClassora((state) => state.announce);

  const records = subjects.length + occurrences.length + attendance.length;

  return (
    <>
      <AppHeader title="Settings" subtitle="Device & data" />

      <div className="space-y-4 px-5">
        <Card>
          <SectionHeader title="Appearance" subtitle="Porcelain theme follows your device" />
          <div className="flex gap-2">
            {(['light', 'system'] as const).map((theme) => (
              <button
                key={theme}
                type="button"
                aria-pressed={settings?.theme === theme}
                onClick={() => void saveSettings({ theme })}
                className={cn(
                  'flex-1 rounded-block border p-3 text-left transition',
                  settings?.theme === theme
                    ? 'border-brand-500 bg-brand-50/60'
                    : 'border-edge bg-surface',
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    name={theme === 'light' ? 'light_mode' : 'contrast'}
                    size={17}
                    className={settings?.theme === theme ? 'text-brand-600' : 'text-ink-muted'}
                  />
                  <span
                    className={cn(
                      'text-label-lg capitalize',
                      settings?.theme === theme ? 'text-brand-700' : 'text-ink',
                    )}
                  >
                    {theme === 'light' ? 'Porcelain light' : 'Follow system'}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="mt-3.5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-label-lg">Working Saturdays</p>
              <p className="text-label-md text-ink-secondary">Show the Saturday column in weekly view</p>
            </div>
            <Pill tone="muted">Set in Academic Calendar</Pill>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Sync & Offline Status"
            subtitle={`${records} items securely stored`}
          />
          <p className="text-body-sm text-ink-secondary">
            Classora stores your schedule and attendance records securely on this device so the app is fast, responsive, and available without signal.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-block bg-surface-muted p-3.5">
              <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">Status</p>
              <p className="mt-1 inline-flex items-center gap-1.5 text-label-lg capitalize">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    syncState === 'offline' || syncState === 'pending' ? 'bg-warning-500' : 'bg-safe-500',
                  )}
                />
                {syncState === 'synced' ? 'Up to date' : syncState}
              </p>
            </div>
            <div className="rounded-block bg-surface-muted p-3.5">
              <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">Data Health</p>
              <p className="mt-1 text-label-lg tabular-nums">{confidence()}%</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Notifications" subtitle="Reminder preferences and device permission" />
          <div className="flex min-h-14 items-center justify-between rounded-block bg-surface-muted px-3.5 py-3">
            <span className="inline-flex items-center gap-2.5 text-label-lg">
              <Icon name="notifications" size={18} className="text-ink-muted" />
              Browser permission
            </span>
            <Pill tone={notifications.permissionStatus() === 'granted' ? 'brand' : 'muted'}>
              {notifications.permissionStatus()}
            </Pill>
          </div>
          <Link
            to="/profile/notifications"
className="mt-3 flex items-center gap-3 text-label-lg text-brand-700"
          >
            Reminder settings
            <Icon name="arrow_forward" size={16} />
          </Link>
        </Card>

        <Card>
          <SectionHeader title="Data ownership" subtitle="Take your records with you" />
          <Link
            to="/settings/export"
            className="flex items-center gap-3 rounded-block bg-surface-muted px-3.5 py-3.5 transition active:scale-[0.995]"
          >
            <Icon name="ios_share" size={19} className="text-ink-muted" />
            <span className="min-w-0 flex-1">
              <span className="block text-label-lg">Export data</span>
              <span className="block text-label-md text-ink-secondary">CSV statement or full JSON backup</span>
            </span>
            <Icon name="chevron_right" size={19} className="text-ink-muted" />
          </Link>
          <p className="mt-3 text-label-sm text-ink-muted">
            Deleting the app removes on-device data. Export first if you want to keep it.
          </p>
        </Card>

        <button
          type="button"
          onClick={() =>
            announce({ tone: 'info', message: 'CampusOne is up to date — build 1.0.0' })
          }
          className="w-full rounded-pill py-3 text-label-md text-ink-muted"
        >
          Check for updates
        </button>

        <p className="pb-2 text-center text-label-sm text-ink-muted">
          CampusOne • Build 1.0.0 • Offline first, built for students
        </p>
      </div>
    </>
  );
}

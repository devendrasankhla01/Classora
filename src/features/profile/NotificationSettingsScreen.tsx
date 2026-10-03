import { useEffect, useState } from 'react';

import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button, Toggle } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { Pill, StatusChip } from '@/components/ui/chips';
import { notifications, type PermissionState } from '@/platform';
import type { NotificationPreference } from '@/types/domain';

const DELAYS: NotificationPreference['reminderDelayMinutes'][] = [0, 10, 30];

/**
 * Reminder tuning — plus the only place the student grants notification
 * permission, with an honest explanation of what is on-device.
 */
export function NotificationSettingsScreen() {
  const preferences = useClassora((state) => state.preferences);
  const profile = useClassora((state) => state.profile);
  const savePreferences = useClassora((state) => state.savePreferences);
  const announce = useClassora((state) => state.announce);
  const notificationsList = useClassora((state) => state.notifications);

  const [permission, setPermission] = useState<PermissionState>(() => notifications.permissionStatus());

  useEffect(() => {
    setPermission(notifications.permissionStatus());
  }, []);

  const prefs: NotificationPreference = preferences ?? {
    id: 'notifpref',
    userId: profile?.id ?? 'local',
    afterClassReminder: true,
    reminderDelayMinutes: 10,
    missingAttendanceReminder: true,
    attendanceRiskAlert: true,
    timetableChangeAlert: true,
    workingSaturdayAlert: true,
    combineBackToBack: true,
    updatedAt: new Date().toISOString(),
  };

  const patch = (next: Partial<NotificationPreference>) => void savePreferences(next);
  const unread = notificationsList.filter((item) => item.readAt === null).length;

  return (
    <>
      <AppHeader title="Reminder Settings" subtitle="Notification preferences" />

      <div className="space-y-4 px-5">
        <Card>
          <SectionHeader
            title="Device permission"
            subtitle="Required before Classora can nudge you."
            action={
              <Pill tone={permission === 'granted' ? 'brand' : permission === 'denied' ? 'danger' : 'muted'}>
                {permission}
              </Pill>
            }
          />

          {permission === 'granted' ? (
            <p className="text-body-sm text-ink-secondary">
              Notifications are enabled on this device. Reminders are scheduled locally from your own
              timetable — no server keeps a copy of your schedule.
            </p>
          ) : permission === 'denied' ? (
            <div className="rounded-block bg-critical-50 p-3.5">
              <p className="text-label-lg text-critical-700">Notifications are blocked</p>
              <p className="mt-1 text-body-sm text-critical-700/90">
                Open your browser's site settings for Classora and allow notifications, then return here. In-app
                banners still work in the meantime.
              </p>
            </div>
          ) : permission === 'unsupported' ? (
            <p className="text-body-sm text-ink-secondary">
              This browser does not support notifications. Classora will keep using in-app reminders.
            </p>
          ) : (
            <Button
              icon="notifications"
              onClick={async () => {
                const result = await notifications.requestPermission();
                setPermission(result);
                announce({
                  tone: result === 'granted' ? 'success' : 'info',
                  message:
                    result === 'granted'
                      ? 'Reminders enabled on this device'
                      : 'Notifications were not enabled — in-app reminders remain',
                });
              }}
            >
              Enable notifications
            </Button>
          )}

          {unread > 0 ? (
            <div className="mt-3.5 flex items-center justify-between rounded-block bg-surface-muted px-3.5 py-3">
              <span className="inline-flex items-center gap-2 text-label-lg">
                <Icon name="inbox" size={17} className="text-ink-muted" />
                {unread} unread {unread === 1 ? 'alert' : 'alerts'} in the app
              </span>
              <StatusChip tone="brand" label="Inbox" showDot={false} />
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionHeader title="Reminders" subtitle="What Classora tells you about" />

          <div className="divide-y divide-divider">
            <SettingRow
              title="After-class reminder"
              hint="Ask you to mark attendance once a lecture ends"
              checked={prefs.afterClassReminder}
              onChange={(value) => patch({ afterClassReminder: value })}
            />

            <div className="min-h-14 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-label-lg">Reminder delay</p>
                  <p className="text-label-md text-ink-secondary">Minutes after the class ends</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {DELAYS.map((delay) => (
                    <button
                      key={delay}
                      type="button"
                      aria-pressed={prefs.reminderDelayMinutes === delay}
                      onClick={() => patch({ reminderDelayMinutes: delay })}
                      className={
                        prefs.reminderDelayMinutes === delay
                          ? 'rounded-pill bg-brand-600 px-3 py-1.5 text-label-md text-white'
                          : 'rounded-pill bg-surface-sunken px-3 py-1.5 text-label-md text-ink-secondary'
                      }
                    >
                      {delay === 0 ? 'Now' : `${delay}m`}
                    </button>
                  ))}
                </div>
              </div>
              {!prefs.afterClassReminder ? (
                <p className="mt-2 text-label-sm text-ink-muted">Turn on after-class reminders to use this.</p>
              ) : null}
            </div>

            <SettingRow
              title="Combine back-to-back classes"
              hint="One reminder instead of three in a row"
              checked={prefs.combineBackToBack}
              onChange={(value) => patch({ combineBackToBack: value })}
            />
            <SettingRow
              title="Missing attendance reminder"
              hint="Ask about classes you never marked, at the end of the day"
              checked={prefs.missingAttendanceReminder}
              onChange={(value) => patch({ missingAttendanceReminder: value })}
            />
            <SettingRow
              title="Timetable change alerts"
              hint="Room swaps, cancellations and extra classes"
              checked={prefs.timetableChangeAlert}
              onChange={(value) => patch({ timetableChangeAlert: value })}
            />
            <SettingRow
              title="Attendance risk alerts"
              hint="Warn when a subject is close to your target threshold"
              checked={prefs.attendanceRiskAlert}
              onChange={(value) => patch({ attendanceRiskAlert: value })}
            />
            <SettingRow
              title="Working Saturday reminder"
              hint="Nudge the evening before a working Saturday"
              checked={prefs.workingSaturdayAlert}
              onChange={(value) => patch({ workingSaturdayAlert: value })}
            />
          </div>
        </Card>

        <Card>
          <SectionHeader title="Test" subtitle="Confirm reminders reach this device" />
          <Button
            variant="secondary"
            icon="send"
            onClick={async () => {
              await notifications.schedule({
                id: `test-${Date.now()}`,
                title: 'Classora test reminder',
                body: 'If you can see this, after-class reminders are working on this device.',
                at: new Date(Date.now() + 2000).toISOString(),
                data: { kind: 'test' },
              });
              announce({ tone: 'info', message: 'Test reminder scheduled for 2 seconds from now' });
            }}
          >
            Send test reminder
          </Button>
        </Card>

        <p className="pb-2 text-center text-label-sm text-ink-muted">
          <Icon name="shield" size={12} className="mr-1 inline align-middle" />
          Preferences are stored on this device and applied by the local scheduler.
        </p>
      </div>
    </>
  );
}

function SettingRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-label-lg">{title}</p>
        <p className="mt-0.5 text-label-md text-ink-secondary">{hint}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

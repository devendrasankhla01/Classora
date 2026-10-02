import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { useNow } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon } from '@/components/ui/Icon';
import { EmptyState } from '@/components/ui/feedback';
import { formatLongDate, todayKey } from '@/lib/date';
import type { AppNotification } from '@/types/domain';

const KIND_META: Record<AppNotification['kind'], { icon: string; tone: string; label: string }> = {
  after_class: { icon: 'pending_actions', tone: 'bg-brand-50 text-brand-600', label: 'Mark attendance' },
  missing_attendance: { icon: 'error_outline', tone: 'bg-warning-50 text-warning-600', label: 'Missing records' },
  risk: { icon: 'trending_down', tone: 'bg-critical-50 text-critical-600', label: 'Attendance risk' },
  timetable_change: { icon: 'sync_alt', tone: 'bg-sky-50 text-sky-600', label: 'Schedule change' },
  working_saturday: { icon: 'event_available', tone: 'bg-violet-50 text-violet-600', label: 'Working Saturday' },
  extra_class: { icon: 'add_circle', tone: 'bg-safe-50 text-safe-700', label: 'Extra class' },
};

/**
 * Notification inbox. Alerts are generated from real state (unmarked classes,
 * subject risk, timetable edits) and can be opened straight into the right
 * screen.
 */
function relativeTime(instant: string): string {
  const minutes = Math.round((Date.now() - new Date(instant).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'Yesterday' : `${days}d ago`;
}

export function NotificationsScreen() {
  const notifications = useClassora((state) => state.notifications);
  const markNotificationRead = useClassora((state) => state.markNotificationRead);
  const navigate = useNavigate();
  const now = useNow();

  const [filter, setFilter] = useState<'unread' | 'all'>('unread');

  const visible = useMemo(() => {
    const list = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return filter === 'unread' ? list.filter((item) => item.readAt === null) : list;
  }, [notifications, filter]);

  const grouped = useMemo(() => {
    const today = todayKey();
    const buckets = new Map<string, AppNotification[]>();
    for (const item of visible) {
      const key = item.date === today ? 'Today' : item.date;
      const bucket = buckets.get(key) ?? [];
      bucket.push(item);
      buckets.set(key, bucket);
    }
    return [...buckets.entries()];
  }, [visible]);

  const unreadCount = notifications.filter((item) => item.readAt === null).length;

  const open = async (notification: AppNotification) => {
    if (notification.readAt === null) await markNotificationRead(notification.id);
    if (notification.kind === 'missing_attendance' || notification.kind === 'after_class') {
      navigate('/attendance/review');
      return;
    }
    if (notification.kind === 'risk') {
      const subject = notification.occurrenceIds[0];
      const insights = useClassora.getState().summaries();
      const match = subject
        ? insights.find((item) => item.subject.id === subject)
        : insights.reduce((worst, item) =>
            (item.summary.percentage ?? 100) < (worst.summary.percentage ?? 100) ? item : worst,
          );
      if (match) navigate(`/attendance/${match.subject.id}`);
      return;
    }
    navigate('/timetable');
  };

  return (
    <>
      <AppHeader
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        unreadCount={unreadCount}
      />

      <div className="space-y-4 px-5">
        {unreadCount > 0 ? (
          <div className="flex items-center justify-between rounded-block bg-surface px-4 py-3 shadow-ambient ring-1 ring-black/[0.03]">
            <span className="text-[12.5px] font-semibold text-ink-secondary">
              {unreadCount} {unreadCount === 1 ? 'alert needs' : 'alerts need'} your attention
            </span>
            <button
              type="button"
              onClick={() => void Promise.all(notifications.map((item) => markNotificationRead(item.id)))}
              className="text-[12.5px] font-bold text-brand-700"
            >
              Mark all read
            </button>
          </div>
        ) : null}

        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'unread', label: `Unread (${unreadCount})` },
            { value: 'all', label: `All (${notifications.length})` },
          ]}
        />

        {grouped.length === 0 ? (
          <Card>
            <EmptyState
              icon="notifications_off"
              title={filter === 'unread' ? 'Nothing unread' : 'No notifications yet'}
              message={
                filter === 'unread'
                  ? 'You have read everything. Switch to All to look back through the history.'
                  : 'Classora will alert you here when a class needs marking, a subject is at risk or your timetable changes.'
              }
            />
          </Card>
        ) : (
          grouped.map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
                {label === 'Today' ? 'Today' : formatLongDate(label)}
              </h2>
              <ul className="space-y-2.5">
                {items.map((item) => {
                  const meta = KIND_META[item.kind];
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void open(item)}
                        className={cn(
                          'w-full rounded-card bg-surface p-4 text-left shadow-ambient ring-1 transition active:scale-[0.995]',
                          item.readAt === null ? 'ring-brand-500/25' : 'ring-black/[0.03]',
                        )}
                      >
                        <div className="flex gap-3.5">
                          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', meta.tone)}>
                            <Icon name={meta.icon} size={19} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-[14px] font-bold">{item.title}</span>
                              {item.readAt === null ? (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" />
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-secondary">
                              {item.body}
                            </span>
                            <span className="mt-1.5 flex items-center gap-2 text-[11px] font-semibold text-ink-muted">
                              <span className="rounded-pill bg-surface-sunken px-2 py-0.5">{meta.label}</span>
                              <span>{relativeTime(item.createdAt)}</span>
                            </span>
                          </span>
                          <Icon name="chevron_right" size={18} className="mt-1 shrink-0 text-ink-muted" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        <p className="pb-2 text-center text-[11px] text-ink-muted">
          Generated on this device · now {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </>
  );
}

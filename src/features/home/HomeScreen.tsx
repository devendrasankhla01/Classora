import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useMissingAttendance, useNow, useTodayOccurrences } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { SectionHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/feedback';
import { Icon } from '@/components/ui/Icon';
import { TimelineClassCard } from '@/features/shared/TimelineClassCard';
import { formatLongDate, greetingFor, todayKey } from '@/lib/date';
import { NextClassCard } from './NextClassCard';
import { AttendanceOverviewCard } from './AttendanceOverviewCard';
import { SmartInsightCard } from './SmartInsightCard';

/**
 * Home — day at a glance.
 *
 * Visual priority (per the approved design): next class, overall attendance,
 * today's classes, then the attendance insight.
 */
export function HomeScreen() {
  const profile = useClassora((state) => state.profile);
  const notifications = useClassora((state) => state.notifications);
  const today = useTodayOccurrences();
  const missing = useMissingAttendance();
  const now = useNow();

  const dateKey = todayKey();
  const firstName = profile?.name?.split(' ')[0] ?? 'there';
  const unread = notifications.filter((notification) => !notification.readAt).length;
  const yesterdayMissing = missing.filter((occurrence) => occurrence.date < dateKey);

  return (
    <>
      <AppHeader
        wordmark
        title={`${greetingFor(now)}, ${firstName}`}
        overline={formatLongDate(dateKey)}
        unreadCount={unread}
      />

      <div className="space-y-4 px-5">
        <NextClassCard />

        {yesterdayMissing.length > 0 ? (
          <Link
            to="/attendance/review"
            className="flex items-center gap-3 rounded-card bg-warning-50 p-4 shadow-ambient ring-1 ring-warning-500/10 transition active:scale-[0.99]"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-warning-600 shadow-ambient">
              <Icon name="pending_actions" size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-lg text-warning-700">
                {yesterdayMissing.length} {yesterdayMissing.length === 1 ? 'class is' : 'classes are'} still
                unmarked
              </p>
              <p className="text-body-sm text-warning-700/80">
                Tap to review and keep your insights accurate.
              </p>
            </div>
            <Icon name="chevron_right" size={20} className="text-warning-600" />
          </Link>
        ) : null}

        <AttendanceOverviewCard />

        <section>
          <SectionHeader
            title="Today’s Schedule"
            action={
              <Link to="/timetable" className="text-label-lg text-brand-700">
                Timetable
              </Link>
            }
          />
          {today.length === 0 ? (
            <div className="rounded-card bg-surface p-2 shadow-ambient ring-1 ring-hairline">
              <EmptyState
                icon="beach_access"
                title="Your schedule is clear today"
                message="No classes are scheduled. Enjoy the break, or add a custom lecture if something changed."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {today.map((occurrence) => (
                <TimelineClassCard key={occurrence.id} occurrence={occurrence} now={now} />
              ))}
            </div>
          )}
        </section>

        <SmartInsightCard />
      </div>
    </>
  );
}

import { Link } from 'react-router-dom';

import { useClassora, type AttendanceAction } from '@/app/store';
import { useNextClass } from '@/hooks/useScheduleData';
import { formatCountdown, formatLongDate, formatTimeLabel, formatTimeRange } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { EmptyState } from '@/components/ui/feedback';

/**
 * "Next Class" card — the primary element on Home. Every value is derived:
 * the class, the countdown, the interval progress and the position in the day.
 */
export function NextClassCard() {
  const { occurrence, subject, state, secondsUntilStart, intervalProgress, indexInDay, dayCount, isToday } =
    useNextClass();
  const markAttendance = useClassora((action) => action.markAttendance);
  const attendance = useClassora((action) => action.attendance);
  const now = new Date();

  if (!occurrence || !subject) {
    return (
      <section className="rounded-card bg-surface p-2 shadow-ambient ring-1 ring-hairline">
        <EmptyState
          icon="event_available"
          title="Your schedule is clear"
          message="No upcoming classes in the timetable. Import a timetable or add a custom lecture to get started."
          action={
            <Link
              to="/timetable"
className="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-600 px-5 text-label-lg text-white shadow-elevated"
            >
              <Icon name="calendar_month" size={18} />
              Open timetable
            </Link>
          }
        />
      </section>
    );
  }

  const record = attendance.find((item) => item.occurrenceId === occurrence.id);
  const finished = new Date(occurrence.endDateTime).getTime() < now.getTime();

  const quick = (action: AttendanceAction) => () => void markAttendance(occurrence.id, action);

  return (
    <section className="overflow-hidden glass-card rounded-2xl sm:rounded-card p-4 sm:p-5 shadow-ambient">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50/90 border border-indigo-200/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
          {state === 'in_progress' ? 'Now • In Progress' : `Next • ${formatCountdown(secondsUntilStart)}`}
        </span>
        <span className="rounded-full bg-slate-100/90 px-2.5 py-1 text-[11px] font-bold text-slate-600">
          Lecture {indexInDay} of {dayCount}
        </span>
      </div>

      <h2 className="mt-4 text-headline-md text-ink">
        {subject.name}
      </h2>
      <p className="mt-1 text-body-md text-ink-secondary">
        {[subject.faculty, subject.defaultRoom, subject.subjectCode].filter(Boolean).join(' • ')}
      </p>

      <div className="mt-4 grid grid-cols-2 divide-x divide-divider rounded-block border border-divider bg-surface-muted">
        <div className="flex items-start gap-3 p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink-secondary shadow-ambient">
            <Icon name="schedule" size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">Time</p>
            <p className="mt-0.5 text-label-lg text-ink">
              {formatTimeRange(occurrence.startTime, occurrence.endTime)}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 p-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink-secondary shadow-ambient">
            <Icon name="location_on" size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">Location</p>
            <p className="mt-0.5 text-label-lg text-ink">
              {occurrence.room ?? 'To be announced'}
            </p>
          </div>
        </div>
      </div>

      {state === 'in_progress' && intervalProgress !== null ? (
        <div className="mt-4">
          <div className="flex items-center justify-between text-label-md">
            <span className="text-ink-secondary">Interval countdown</span>
            <span className="text-brand-700">{Math.round(intervalProgress)}% passed</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-pill bg-surface-sunken">
            <div
              className="h-full rounded-pill bg-brand-600 transition-[width] duration-700 ease-porcelain"
              style={{ width: `${intervalProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-body-sm text-ink-secondary">
          {isToday ? `Today • ${formatLongDate(occurrence.date)}` : formatLongDate(occurrence.date)}
        </p>
        {finished ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {record ? (
              <>
                <StatusChip tone={record.status === 'present' ? 'safe' : 'critical'} label={record.status === 'present' ? 'Present' : 'Absent'} />
                <button
                  type="button"
                  onClick={() => void markAttendance(occurrence.id, record.status === 'present' ? 'absent' : 'present')}
className="text-label-md text-brand-700"
                >
                  Change
                </button>
              </>
            ) : (
              <>
                <QuickAction label="Present" icon="check" onClick={quick('present')} tone="safe" />
                <QuickAction label="Absent" icon="close" onClick={quick('absent')} tone="critical" />
              </>
            )}
          </div>
        ) : (
          <Link
            to="/timetable"
className="inline-flex min-h-[40px] items-center gap-1.5 rounded-pill bg-brand-50 px-4 text-label-lg text-brand-700"
          >
            <Icon name="edit_calendar" size={16} />
            Modify day
          </Link>
        )}
      </div>
    </section>
  );
}

function QuickAction({
  label,
  icon,
  onClick,
  tone,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  tone: 'safe' | 'critical';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        tone === 'safe'
          ? 'inline-flex min-h-[40px] items-center gap-1.5 rounded-pill bg-safe-50 px-4 text-label-lg text-safe-700 transition active:scale-95'
          : 'inline-flex min-h-[40px] items-center gap-1.5 rounded-pill bg-critical-50 px-4 text-label-lg text-critical-600 transition active:scale-95'
      }
    >
      <Icon name={icon} size={16} />
      {label}
    </button>
  );
}

export { formatTimeLabel };

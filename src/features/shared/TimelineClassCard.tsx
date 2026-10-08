import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { occurrenceState } from '@/lib/occurrenceState';
import { formatTimeRange } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { AttendanceActions } from './AttendanceActions';
import type { ClassOccurrence } from '@/types/domain';

interface TimelineClassCardProps {
  occurrence: ClassOccurrence;
  now: Date;
  onModify?: (occurrence: ClassOccurrence) => void;
  showActions?: boolean;
}

/**
 * The timeline class card from the Timetable screen: coloured accent bar,
 * status chip, faculty line, meta row with quick actions.
 */
export function TimelineClassCard({
  occurrence,
  now,
  onModify,
  showActions = true,
}: TimelineClassCardProps) {
  const subjects = useClassora((state) => state.subjects);
  const attendance = useClassora((state) => state.attendance);

  const subject = subjects.find((item) => item.id === occurrence.subjectId);
  const record = attendance.find((item) => item.occurrenceId === occurrence.id);
  const info = occurrenceState(occurrence, now, record?.status);

  const isPast = new Date(occurrence.endDateTime).getTime() <= now.getTime();
  const accent =
    info.state === 'completed'
      ? record?.status === 'absent'
        ? 'border-l-critical-500'
        : 'border-l-safe-500'
      : info.state === 'in_progress'
        ? 'border-l-brand-600'
        : info.state === 'cancelled' || info.state === 'not_conducted'
          ? 'border-l-ink-muted'
          : info.state === 'unmarked'
            ? 'border-l-warning-500'
            : 'border-l-brand-400';

  return (
    <article
      className={cn(
        'rounded-card border-l-[3px] bg-surface p-4 shadow-ambient ring-1 ring-black/[0.03]',
        accent,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[17px] font-bold leading-snug tracking-[-0.01em] text-ink">
          {subject?.name ?? 'Class'}
        </h3>
        <StatusChip tone={info.tone} label={info.label} icon={info.icon} showDot={!info.icon} />
      </div>

      <p className="mt-1 text-[13px] text-ink-secondary">
        {occurrence.notes && occurrence.occurrenceType !== 'regular'
          ? occurrence.notes
          : (occurrence.facultyOverride ?? subject?.faculty ?? 'Faculty to be announced')}
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12.5px] font-medium text-ink-secondary">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="schedule" size={15} className="text-ink-muted" />
          {formatTimeRange(occurrence.startTime, occurrence.endTime)}
        </span>
        {occurrence.room ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="apartment" size={15} className="text-ink-muted" />
            {occurrence.room}
          </span>
        ) : null}
        {occurrence.classType === 'lab' ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="laptop_mac" size={15} className="text-ink-muted" />
            Lab
          </span>
        ) : null}
      </div>

      {showActions ? (
        <div className="mt-3.5 flex items-center justify-between gap-3">
          {isPast && info.state === 'unmarked' ? (
            <AttendanceActions occurrence={occurrence} compact />
          ) : isPast && record ? (
            <button
              type="button"
              onClick={() => onModify?.(occurrence)}
              className="min-h-[40px] rounded-pill bg-surface-sunken px-3.5 text-[12.5px] font-semibold text-ink-secondary"
            >
              Edit record
            </button>
          ) : (
            <Link
              to={`/attendance/${subject?.id ?? ''}`}
              className="min-h-[40px] rounded-pill bg-surface-sunken px-3.5 text-[12.5px] font-semibold text-ink-secondary inline-flex items-center"
            >
              Subject details
            </Link>
          )}

          {onModify ? (
            <button
              type="button"
              onClick={() => onModify(occurrence)}
              aria-label="Modify this class"
              className="grid h-10 w-10 place-items-center rounded-full bg-surface-sunken text-ink-secondary transition active:scale-95"
            >
              <Icon name="settings" size={17} />
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

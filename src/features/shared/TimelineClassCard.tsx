import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { occurrenceState } from '@/lib/occurrenceState';
import { formatTimeRange } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import { AttendanceActions } from './AttendanceActions';
import type { ClassOccurrence } from '@/types/domain';

interface TimelineClassCardProps {
  occurrence: ClassOccurrence;
  now: Date;
  onModify?: (occurrence: ClassOccurrence) => void;
  showActions?: boolean;
}

/**
 * Task / Class Card — Inspired by Reference Screenshots 1, 4 & 5
 * Features: Status pill, title, 3-dots menu button, meta row with icons, and linear progress bar
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

  // Progress simulation for class/task
  let progressPercent = 0;
  if (info.state === 'completed') progressPercent = 100;
  else if (info.state === 'in_progress') progressPercent = 65;
  else if (info.state === 'unmarked') progressPercent = 50;
  else progressPercent = 0;

  // Status Badge Colors matching reference images
  let statusBadgeStyle = 'bg-sky-50 text-sky-600 border-sky-100';
  let statusText = 'Ongoing';

  if (info.state === 'completed') {
    statusBadgeStyle = record?.status === 'present' 
      ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
      : 'bg-rose-50 text-rose-600 border-rose-100';
    statusText = record?.status === 'present' ? 'Attended' : record?.status === 'absent' ? 'Missed' : 'Completed';
  } else if (info.state === 'in_progress') {
    statusBadgeStyle = 'bg-orange-50 text-orange-600 border-orange-100';
    statusText = 'Running Now';
  } else if (info.state === 'upcoming') {
    statusBadgeStyle = 'bg-purple-50 text-purple-600 border-purple-100';
    statusText = 'Upcoming';
  }

  return (
    <article
      className={cn(
        'rounded-3xl bg-white p-5 shadow-sm border border-slate-100/90 transition-all duration-200 hover:shadow-md space-y-3.5',
      )}
    >
      {/* Top Header Row: Status Badge & Context Menu Dots */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border',
            statusBadgeStyle,
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {statusText}
        </span>

        {onModify ? (
          <button
            type="button"
            onClick={() => onModify(occurrence)}
            aria-label="Options"
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <Icon name="more_vert" size={18} />
          </button>
        ) : (
          <span className="text-slate-400">
            <Icon name="more_vert" size={18} />
          </span>
        )}
      </div>

      {/* Title & Description */}
      <div>
        <h3 className="text-base font-bold text-slate-900 tracking-tight">
          {subject?.name ?? 'Class Lecture'}
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          {occurrence.notes ?? (occurrence.facultyOverride ?? subject?.faculty ?? 'Faculty to be announced')}
        </p>
      </div>

      {/* Meta details row: Time & Room */}
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5">
          <Icon name="schedule" size={15} className="text-slate-400" />
          {formatTimeRange(occurrence.startTime, occurrence.endTime)}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="location_on" size={15} className="text-slate-400" />
          {occurrence.room ?? 'Room 101'}
        </span>
      </div>

      {/* Linear Dual-Tone Progress Bar (Tasknur Style) */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-400">Progress</span>
          <span className="text-sky-600">{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Action Row */}
      {showActions ? (
        <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
          {isPast && info.state === 'unmarked' ? (
            <AttendanceActions occurrence={occurrence} compact />
          ) : isPast && record ? (
            <button
              type="button"
              onClick={() => onModify?.(occurrence)}
              className="text-xs font-bold text-sky-600 hover:text-sky-700 underline"
            >
              Edit attendance ({record.status})
            </button>
          ) : (
            <Link
              to={`/attendance/${subject?.id ?? ''}`}
              className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
            >
              Subject details
              <Icon name="arrow_forward" size={14} />
            </Link>
          )}
        </div>
      ) : null}
    </article>
  );
}

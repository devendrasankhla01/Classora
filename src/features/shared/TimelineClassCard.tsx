import { motion } from 'framer-motion';
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
 * Task / Class Card — Crafted after Reference Screenshots 1, 3, 4 & 5
 * Features:
 * - Status pill (Ongoing, Working, Running, Attended)
 * - 3-dots menu button
 * - Overlapping person avatars ("04 Persons") & time label
 * - Smooth colored horizontal progress bar with percentage indicator
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

  // Progress simulation for class/task matching screenshot metrics
  let progressPercent = 60;
  if (info.state === 'completed') progressPercent = record?.status === 'present' ? 100 : 40;
  else if (info.state === 'in_progress') progressPercent = 75;
  else progressPercent = 60;

  // Persons count simulation matching Tasknur design
  const personsCount = 4 + (occurrence.id.charCodeAt(0) % 3);

  // Accent theme color based on status
  let barGradient = 'from-[#38b6ff] to-[#0094e8]';
  let progressTextColor = 'text-[#38b6ff]';

  if (info.state === 'completed') {
    barGradient = record?.status === 'present' ? 'from-emerald-400 to-emerald-600' : 'from-rose-400 to-rose-600';
    progressTextColor = record?.status === 'present' ? 'text-emerald-600' : 'text-rose-600';
  } else if (info.state === 'in_progress') {
    barGradient = 'from-[#FF7657] to-[#F97316]';
    progressTextColor = 'text-[#FF7657]';
  } else if (info.state === 'upcoming') {
    barGradient = 'from-[#9b51e0] to-[#7000ff]';
    progressTextColor = 'text-[#9b51e0]';
  }

  return (
    <motion.article
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'neu-card rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 space-y-3 flex flex-col justify-between cursor-pointer min-w-0 overflow-hidden',
      )}
    >
      <div className="space-y-2.5">
        {/* Top Title & 3-dots Context Menu */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug truncate">
              {subject?.name ?? 'Class Lecture'}
            </h3>
            <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-0.5 truncate">
              {occurrence.notes ?? (occurrence.facultyOverride ?? subject?.faculty ?? 'Faculty to be announced')}
            </p>
          </div>

          {onModify ? (
            <button
              type="button"
              onClick={() => onModify(occurrence)}
              aria-label="Options"
              className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <Icon name="more_vert" size={16} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Options"
              className="grid h-7 w-7 sm:h-8 sm:w-8 shrink-0 place-items-center rounded-full text-slate-300"
            >
              <Icon name="more_vert" size={16} />
            </button>
          )}
        </div>

        {/* Sub-info Row matching Screenshots: Time + Avatars "04 Persons" */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 pt-0.5">
          <span className="flex items-center gap-1 text-slate-400 truncate">
            <Icon name="schedule" size={14} />
            {formatTimeRange(occurrence.startTime, occurrence.endTime)}
          </span>

          <div className="flex items-center gap-1 shrink-0">
            {/* Overlapping mini avatar circles */}
            <div className="flex -space-x-1 overflow-hidden">
              <span className="inline-block h-4 w-4 sm:h-5 sm:w-5 rounded-full ring-2 ring-white bg-sky-200 text-[8px] sm:text-[9px] font-bold text-sky-800 flex items-center justify-center shadow-2xs">
                A
              </span>
              <span className="inline-block h-4 w-4 sm:h-5 sm:w-5 rounded-full ring-2 ring-white bg-purple-200 text-[8px] sm:text-[9px] font-bold text-purple-800 flex items-center justify-center shadow-2xs">
                B
              </span>
              <span className="inline-block h-4 w-4 sm:h-5 sm:w-5 rounded-full ring-2 ring-white bg-orange-200 text-[8px] sm:text-[9px] font-bold text-orange-800 flex items-center justify-center shadow-2xs">
                C
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">0{personsCount} Persons</span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Actions */}
      <div className="space-y-2.5 pt-1">
        {/* Neumorphic Inset Progress Track with 3D gradient fill */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold">
            <span className="text-slate-400 font-semibold">Progress</span>
            <span className={progressTextColor}>{progressPercent}%</span>
          </div>
          <div className="h-2 sm:h-2.5 w-full overflow-hidden rounded-full neu-sunken p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`h-full rounded-full bg-gradient-to-r ${barGradient} shadow-sm`}
            />
          </div>
        </div>

        {/* Action Row */}
        {showActions ? (
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100/80 flex-wrap">
            {isPast && info.state === 'unmarked' ? (
              <AttendanceActions occurrence={occurrence} compact />
            ) : isPast && record ? (
              <button
                type="button"
                onClick={() => onModify?.(occurrence)}
                className="text-[11px] sm:text-xs font-extrabold text-[#38B6FF] hover:text-sky-700 underline"
              >
                Edit ({record.status})
              </button>
            ) : (
              <Link
                to={`/attendance/${subject?.id ?? ''}`}
                className="text-[11px] sm:text-xs font-extrabold text-[#38B6FF] hover:underline flex items-center gap-1"
              >
                Details
                <Icon name="arrow_forward" size={14} />
              </Link>
            )}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
}


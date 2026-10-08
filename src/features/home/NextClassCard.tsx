import { Link } from 'react-router-dom';

import { useClassora, type AttendanceAction } from '@/app/store';
import { useNextClass, useAggregateStats } from '@/hooks/useScheduleData';
import { formatCountdown, formatTimeRange } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';

/**
 * Dark Hero Summary Card — Inspired by Reference Screenshot 4
 * Features: Dark navy slate container, radial gauge ring (e.g. 95%), countdown chip, CTA button
 */
export function NextClassCard() {
  const { occurrence, subject, state, secondsUntilStart, indexInDay, dayCount } =
    useNextClass();
  const markAttendance = useClassora((action) => action.markAttendance);
  const attendance = useClassora((action) => action.attendance);
  const stats = useAggregateStats();
  const now = new Date();

  if (!occurrence || !subject) {
    return (
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center sm:text-left">
            <span className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-400 border border-sky-500/30">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              Schedule Clear Today
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Your daily attendance target is on track!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md">
              No more classes scheduled for today. Enjoy your day or review upcoming timetable.
            </p>
            <div className="pt-2">
              <Link
                to="/timetable"
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition"
              >
                <Icon name="calendar_month" size={18} />
                View Timetable
              </Link>
            </div>
          </div>

          {/* Radial Ring Meter */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg className="h-28 w-28 -rotate-90 transform">
              <circle
                cx="56"
                cy="56"
                r="46"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-800"
                fill="transparent"
              />
              <circle
                cx="56"
                cy="56"
                r="46"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={289}
                strokeDashoffset={289 - (289 * (stats.percentage ?? 95)) / 100}
                strokeLinecap="round"
                className="text-sky-400 transition-all duration-1000 ease-out"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white">{stats.percentage}%</span>
              <span className="text-[10px] font-semibold text-slate-400">Target</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const record = attendance.find((item) => item.occurrenceId === occurrence.id);
  const finished = new Date(occurrence.endDateTime).getTime() < now.getTime();
  const quick = (action: AttendanceAction) => () => void markAttendance(occurrence.id, action);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-xl border border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        
        {/* Left Column Info */}
        <div className="space-y-3 flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-400 border border-sky-500/30">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
              {state === 'in_progress' ? 'Now • In Progress' : `Next • ${formatCountdown(secondsUntilStart)}`}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
              Lecture {indexInDay} of {dayCount}
            </span>
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
              {subject.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {[subject.faculty, subject.defaultRoom, subject.subjectCode].filter(Boolean).join(' • ')}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-slate-300 pt-1">
            <span className="flex items-center gap-1.5">
              <Icon name="schedule" size={16} className="text-sky-400" />
              {formatTimeRange(occurrence.startTime, occurrence.endTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="location_on" size={16} className="text-purple-400" />
              {occurrence.room ?? 'Room TBD'}
            </span>
          </div>

          {/* Quick Mark Actions */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            {finished ? (
              record ? (
                <div className="flex items-center gap-2">
                  <StatusChip tone={record.status === 'present' ? 'safe' : 'critical'} label={record.status === 'present' ? 'Present' : 'Absent'} />
                  <button
                    type="button"
                    onClick={() => void markAttendance(occurrence.id, record.status === 'present' ? 'absent' : 'present')}
                    className="text-xs font-bold text-sky-400 underline decoration-sky-400/40"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={quick('present')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition active:scale-95"
                  >
                    Mark Present
                  </button>
                  <button
                    type="button"
                    onClick={quick('absent')}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition active:scale-95"
                  >
                    Mark Absent
                  </button>
                </div>
              )
            ) : (
              <Link
                to="/timetable"
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition"
              >
                View Lecture Details
              </Link>
            )}
          </div>
        </div>

        {/* Right Radial Gauge Meter (Tasknur Style) */}
        <div className="relative flex shrink-0 items-center justify-center self-center sm:self-auto">
          <svg className="h-28 w-28 -rotate-90 transform">
            <circle
              cx="56"
              cy="56"
              r="46"
              stroke="currentColor"
              strokeWidth="10"
              className="text-slate-800"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="46"
              stroke="currentColor"
              strokeWidth="10"
              strokeDasharray={289}
              strokeDashoffset={289 - (289 * (stats.percentage ?? 85)) / 100}
              strokeLinecap="round"
              className="text-sky-400 transition-all duration-1000 ease-out"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-white">{stats.percentage}%</span>
            <span className="text-[10px] font-semibold text-slate-400">Target</span>
          </div>
        </div>

      </div>
    </section>
  );
}

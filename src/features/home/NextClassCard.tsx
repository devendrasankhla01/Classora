import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { useClassora, type AttendanceAction } from '@/app/store';
import { useNextClass, useAggregateStats } from '@/hooks/useScheduleData';
import { formatCountdown, formatTimeRange } from '@/lib/date';
import { Icon } from '@/components/ui/Icon';
import { StatusChip } from '@/components/ui/chips';
import { AnimatedCounter } from '@/components/ui/AnimatedContainer';

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
  const profile = useClassora((state) => state.profile);
  const now = new Date();
  const target = profile?.attendanceTarget ?? 85;

  if (!occurrence || !subject) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-xl border border-slate-800"
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center sm:text-left flex-1 min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-400 border border-sky-500/30">
                <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
                Schedule Clear Today
              </span>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                Lecture 0 of 0
              </span>
            </div>
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-400">
              ACADEMIC MODULE
            </p>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Your daily attendance target is on track!
            </h2>
            <p className="text-xs text-slate-300 max-w-md">
              No more classes scheduled for today. Enjoy your day or review upcoming timetable.
            </p>
            <div className="pt-2 flex items-center justify-center sm:justify-start gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Link
                  to="/timetable"
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-500/30 hover:opacity-95 transition"
                >
                  View Lecture Details
                  <Icon name="arrow_forward" size={16} />
                </Link>
              </motion.div>
              <button
                type="button"
                aria-label="Pin Card"
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:text-white transition active:scale-95"
              >
                <Icon name="push_pin" size={18} />
              </button>
            </div>
          </div>

          {/* Radial Ring Meter with TARGET & Required text */}
          <div className="relative flex shrink-0 items-center justify-center">
            <div className="relative grid place-items-center rounded-2xl bg-slate-800/60 p-3 border border-slate-700/60">
              <svg className="h-24 w-24 -rotate-90 transform">
                <circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-slate-800"
                  fill="transparent"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="38"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={238}
                  initial={{ strokeDashoffset: 238 }}
                  animate={{ strokeDashoffset: 238 - (238 * (stats.percentage ?? target)) / 100 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                  strokeLinecap="round"
                  className="text-sky-400"
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <div className="flex items-baseline gap-0.5">
                  <AnimatedCounter value={stats.percentage ?? target} suffix="%" className="text-lg font-black text-white" />
                </div>
                <span className="text-[9px] font-extrabold tracking-wider text-sky-400 uppercase">TARGET</span>
                <span className="text-[9px] font-medium text-slate-400 mt-0.5">Required</span>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    );
  }

  const record = attendance.find((item) => item.occurrenceId === occurrence.id);
  const finished = new Date(occurrence.endDateTime).getTime() < now.getTime();
  const quick = (action: AttendanceAction) => () => void markAttendance(occurrence.id, action);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-5 sm:p-6 shadow-xl border border-slate-800 space-y-4"
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1 text-xs font-bold text-sky-400 border border-sky-500/30">
          <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
          {state === 'in_progress' ? 'Now • In Progress' : `Next • in ${formatCountdown(secondsUntilStart)}`}
        </span>
        <span className="rounded-full bg-slate-800/90 border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300">
          Lecture {indexInDay} of {dayCount}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        
        {/* Left Info Column */}
        <div className="space-y-3 flex-1 min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-400">
            {subject.subjectCode || 'CORE COMPUTER SCIENCE'}
          </p>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white truncate">
            {subject.name}
          </h2>

          <div className="space-y-1.5 text-xs text-slate-300 pt-0.5">
            {subject.faculty ? (
              <p className="flex items-center gap-2 font-medium text-slate-200">
                <Icon name="person" size={16} className="text-sky-400 shrink-0" />
                <span>{subject.faculty}</span>
              </p>
            ) : null}

            <div className="flex items-center gap-4 flex-wrap pt-0.5">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Icon name="schedule" size={16} className="text-sky-400 shrink-0" />
                {formatTimeRange(occurrence.startTime, occurrence.endTime)}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Icon name="domain" size={16} className="text-indigo-400 shrink-0" />
                {occurrence.room ?? subject.defaultRoom ?? 'Hall E201'}
              </span>
            </div>
          </div>

          {/* Quick Mark Actions & Buttons matching reference image */}
          <div className="pt-2 flex items-center gap-3 flex-wrap">
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
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={quick('present')}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition"
                  >
                    Mark Present
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={quick('absent')}
                    className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition"
                  >
                    Mark Absent
                  </motion.button>
                </div>
              )
            ) : (
              <>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/timetable"
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-blue-500/30 hover:opacity-95 transition"
                  >
                    View Lecture Details
                    <Icon name="arrow_forward" size={16} />
                  </Link>
                </motion.div>

                <button
                  type="button"
                  aria-label="Pin Card"
                  className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-800/90 text-slate-300 border border-slate-700/80 hover:text-white transition active:scale-95"
                >
                  <Icon name="push_pin" size={18} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Radial Gauge Meter with TARGET and Required badge */}
        <div className="relative flex shrink-0 items-center justify-center self-center sm:self-auto">
          <div className="relative grid place-items-center rounded-2xl bg-slate-800/60 p-3 border border-slate-700/60">
            <svg className="h-24 w-24 -rotate-90 transform">
              <circle
                cx="48"
                cy="48"
                r="38"
                stroke="currentColor"
                strokeWidth="8"
                className="text-slate-800"
                fill="transparent"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="38"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={238}
                initial={{ strokeDashoffset: 238 }}
                animate={{ strokeDashoffset: 238 - (238 * (stats.percentage ?? target)) / 100 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                strokeLinecap="round"
                className="text-sky-400"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <div className="flex items-baseline gap-0.5">
                <AnimatedCounter value={stats.percentage ?? target} suffix="%" className="text-lg font-black text-white" />
              </div>
              <span className="text-[9px] font-extrabold tracking-wider text-sky-400 uppercase">TARGET</span>
              <span className="text-[9px] font-medium text-slate-400 mt-0.5">Required</span>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

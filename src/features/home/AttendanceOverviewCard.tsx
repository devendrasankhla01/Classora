import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useAggregateStats, useConfidence, useSafeMissTotal } from '@/hooks/useScheduleData';
import { AttendanceGauge } from '@/components/attendance/AttendanceGauge';
import { Icon } from '@/components/ui/Icon';

export function AttendanceOverviewCard() {
  const stats = useAggregateStats();
  const confidence = useConfidence();
  const profile = useClassora((state) => state.profile);
  const target = profile?.attendanceTarget ?? 85;
  const safeMisses = useSafeMissTotal();

  return (
    <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100/90 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 text-sky-600 font-bold">
            <Icon name="insights" size={22} />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">Attendance Overview</h2>
            <p className="text-xs text-slate-500 font-medium">Real-time attendance calculations</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-slate-100 text-xs font-bold text-slate-700">
          Target {target}%
        </span>
      </div>

      <div className="flex justify-center py-2">
        <AttendanceGauge value={stats.percentage} caption="Overall attendance" size={180} target={target} />
      </div>

      {/* Safe Zone Alert */}
      <div className="flex items-start gap-3 rounded-2xl bg-sky-50/80 p-4 border border-sky-100">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sky-500 text-white shadow-sm">
          <Icon name="check" size={18} weight={700} />
        </span>
        <p className="text-xs font-semibold text-sky-900 leading-relaxed">
          {safeMisses > 0 ? (
            <>
              <span className="font-bold">Safe Zone:</span> You can safely miss up to{' '}
              <Link
                to="/can-i-skip"
                className="font-bold underline decoration-sky-500 underline-offset-2 hover:text-sky-700"
              >
                {safeMisses} more {safeMisses === 1 ? 'class' : 'classes'}
              </Link>{' '}
              while staying above {target}%.
            </>
          ) : (
            <>
              <span className="font-bold text-rose-600">At risk:</span> No buffer left — attend your upcoming classes to stay above {target}%.
            </>
          )}
        </p>
      </div>

      {/* 3 Stat columns */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/70 py-4">
        <StatColumn label="Attended" value={stats.attended} color="#10B981" />
        <StatColumn label="Missed" value={stats.missed} color="#EF4444" />
        <StatColumn label="Conducted" value={stats.conducted} color="#6B7280" />
      </div>

      <div className="flex items-center justify-between text-xs font-medium text-slate-500 pt-1">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="verified" size={15} className="text-sky-600" />
          Data confidence {confidence.percent}%
        </span>
        {confidence.missingClasses > 0 ? (
          <Link to="/attendance/review" className="font-bold text-sky-600 hover:underline">
            Review {confidence.missingClasses} missing
          </Link>
        ) : (
          <span className="text-slate-400">All updated</span>
        )}
      </div>
    </section>
  );
}

function StatColumn({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="px-2 text-center">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useAggregateStats, useConfidence, useSubjectInsights } from '@/hooks/useScheduleData';
import { useClassora } from '@/app/store';
import { AppHeader } from '@/components/layout/AppHeader';
import { AttendanceRing } from '@/components/attendance/AttendanceGauge';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/controls';
import { Pill } from '@/components/ui/chips';
import { EmptyState } from '@/components/ui/feedback';
import { SubjectAttendanceCard } from './SubjectAttendanceCard';
import type { AttendanceHealth } from '@/lib/attendance';

type Filter = 'all' | 'safe' | 'warning' | 'critical';

/**
 * Attendance — aggregate health first, then risk per subject, then recovery.
 */
export function AttendanceScreen() {
  const insights = useSubjectInsights();
  const stats = useAggregateStats();
  const profile = useClassora((state) => state.profile);
  const target = profile?.attendanceTarget ?? 85;
  const confidence = useConfidence();
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const tally: Record<Filter, number> = { all: insights.length, safe: 0, warning: 0, critical: 0 };
    for (const insight of insights) {
      if (insight.status.health === 'safe') tally.safe += 1;
      else if (insight.status.health === 'warning') tally.warning += 1;
      else if (insight.status.health === 'critical') tally.critical += 1;
    }
    return tally;
  }, [insights]);

  const filtered = useMemo(
    () => (filter === 'all' ? insights : insights.filter((insight) => insight.status.health === filter)),
    [insights, filter],
  );

  const planner = useMemo(() => {
    const critical = insights
      .filter((insight) => insight.status.health === 'critical' && insight.recovery.classes > 0)
      .sort((a, b) => (a.summary.percentage ?? 0) - (b.summary.percentage ?? 0));
    return critical[0] ?? null;
  }, [insights]);

  const nextClass = planner?.upcoming[0] ?? null;

  return (
    <>
      <AppHeader title="Attendance" subtitle="Overall Status" />

      <div className="space-y-5 pb-8">
        <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Aggregate Health
            </p>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full shadow-2xs">
              <Icon name="verified" size={14} className="text-emerald-600" />
              Live Tracking
            </span>
          </div>

          <div className="mt-2 flex justify-center">
            <AttendanceRing value={stats.percentage} delta={null} size={190} target={target} />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {stats.health === 'safe' ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-extrabold text-emerald-800 shadow-2xs">
                <Icon name="check_circle" size={16} className="text-emerald-600" filled />
                Safe Zone
                <span className="font-semibold text-emerald-700/80">
                  · {Math.round(stats.confidence)}% confidence
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200/80 px-4 py-1.5 text-xs font-extrabold text-amber-800 shadow-2xs">
                <Icon name="error" size={16} className="text-amber-600" />
                {stats.health === 'critical' ? 'Below target' : 'Thin margin'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5 rounded-2xl bg-[#F6F8FA] p-2 border border-slate-100">
            <Stat label="Attended" value={stats.attended} color="#10B981" />
            <Stat label="Missed" value={stats.missed} color="#EF4444" />
            <Stat label="Conducted" value={stats.conducted} color="#38B6FF" />
          </div>

          {confidence.missingClasses > 0 ? (
            <Link
              to="/attendance/review"
              className="flex items-center justify-between rounded-2xl bg-amber-50/90 border border-amber-200/80 px-4 py-3 shadow-2xs hover:bg-amber-100/70 transition-colors"
            >
              <span className="text-xs font-bold text-amber-900">
                {confidence.missingClasses} past {confidence.missingClasses === 1 ? 'class' : 'classes'} not
                updated yet
              </span>
              <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1">
                Review <Icon name="arrow_forward" size={15} />
              </span>
            </Link>
          ) : null}
        </section>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <FilterChip label={`All (${counts.all})`} active={filter === 'all'} onClick={() => setFilter('all')} />
          <FilterChip label={`Safe (${counts.safe})`} active={filter === 'safe'} onClick={() => setFilter('safe')} />
          <FilterChip
            label={`Warning (${counts.warning})`}
            active={filter === 'warning'}
            onClick={() => setFilter('warning')}
          />
          <FilterChip
            label={`Critical (${counts.critical})`}
            active={filter === 'critical'}
            onClick={() => setFilter('critical')}
          />
        </div>

        {insights.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 text-center">
            <EmptyState
              icon="library_books"
              title="No subjects added yet"
              message="Add your subjects or import a timetable to begin tracking your attendance."
              action={
                <Link
                  to="/profile/subjects"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-[#38B6FF] px-5 text-xs font-extrabold text-white shadow-md shadow-sky-500/25 hover:bg-[#0094e8] transition"
                >
                  <Icon name="add" size={18} />
                  Add subjects
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100 text-center">
            <EmptyState
              icon="filter_list_off"
              title="Nothing in this filter"
              message="No subjects currently match this attendance state."
            />
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((insight) => (
              <SubjectAttendanceCard key={insight.subject.id} insight={insight} />
            ))}
          </div>
        )}

        {planner ? (
          <section className="flex items-start gap-3.5 rounded-3xl bg-sky-50 p-5 border border-sky-100">
            <IconTile icon="auto_awesome" tone="indigo" size={40} iconSize={20} />
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-sky-900">Proactive Planner</p>
              <p className="mt-0.5 text-xs font-semibold text-sky-800 leading-relaxed">
                Attend{' '}
                {nextClass
                  ? `${nextClass.date === new Date().toISOString().slice(0, 10) ? 'today’s' : 'the next'} ${planner.recovery.classes}`
                  : `the next ${planner.recovery.classes}`}{' '}
                {planner.subject.shortName} {planner.recovery.classes === 1 ? 'lecture' : 'lectures'} to jump back
                above {planner.target}%.
              </p>
              <Link
                to={`/attendance/${planner.subject.id}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-[#38B6FF] hover:underline"
              >
                Recovery plan
                <Icon name="arrow_forward" size={15} />
              </Link>
            </div>
          </section>
        ) : (
          <section className="flex items-start gap-3.5 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
            <IconTile icon="shield" tone="emerald" size={40} iconSize={20} />
            <div>
              <p className="text-xs font-extrabold text-slate-900">Every subject is above target</p>
              <p className="mt-0.5 text-xs text-slate-400 font-semibold leading-relaxed">
                Nothing needs recovery right now. Keep marking attendance after each class.
              </p>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-2">
          <Pill icon="info">Target: {Math.round(confidence.percent)}% data confidence</Pill>
          <Pill icon="event_available">Semester scope</Pill>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white p-2.5 text-center shadow-2xs border border-slate-100">
      <p className="inline-flex items-center justify-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="mt-1 text-base font-extrabold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'shrink-0 rounded-xl bg-[#38B6FF] px-4.5 py-2 text-xs font-extrabold text-white shadow-md shadow-sky-500/25 transition-all duration-200'
          : 'shrink-0 rounded-xl bg-white border border-slate-100 px-4.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all duration-200'
      }
    >
      {label}
    </button>
  );
}

export type { AttendanceHealth };


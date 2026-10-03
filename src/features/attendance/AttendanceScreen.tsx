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
import { classoraGreen, classoraInkMuted, classoraRed } from '@/lib/palette';
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
  const target = profile?.attendanceTarget ?? 75;
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

      <div className="space-y-5 px-5">
        <section className="rounded-card bg-gradient-to-b from-safe-50/70 to-surface p-5 shadow-ambient ring-1 ring-hairline">
          <div className="flex items-center justify-between">
            <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
              Aggregate health
            </p>
            <Icon name="verified" size={18} className="text-safe-600" />
          </div>

          <div className="mt-3 flex justify-center">
            <AttendanceRing value={stats.percentage} delta={null} size={186} target={target} />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {stats.health === 'safe' ? (
              <span className="inline-flex items-center gap-2 rounded-pill bg-safe-50 px-3.5 py-2 text-label-md text-safe-700">
                <Icon name="check_circle" size={15} filled />
                Safe Zone
                <span className="font-medium text-safe-700/80">
                  · {Math.round(stats.confidence)}% data confidence
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-pill bg-warning-50 px-3.5 py-2 text-label-md text-warning-700">
                <Icon name="error" size={15} />
                {stats.health === 'critical' ? 'Below target' : 'Thin margin'}
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-divider rounded-block border border-divider bg-surface/80 py-3.5">
            <Stat label="Attended" value={stats.attended} color={classoraGreen} />
            <Stat label="Missed" value={stats.missed} color={classoraRed} />
            <Stat label="Conducted" value={stats.conducted} color={classoraInkMuted} />
          </div>

          {confidence.missingClasses > 0 ? (
            <Link
              to="/attendance/review"
              className="mt-3 flex items-center justify-between rounded-block bg-warning-50 px-3.5 py-3"
            >
              <span className="text-label-md text-warning-700">
                {confidence.missingClasses} past {confidence.missingClasses === 1 ? 'class' : 'classes'} not
                updated yet
              </span>
              <span className="text-label-md text-warning-700">Review</span>
            </Link>
          ) : null}
        </section>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
          <div className="rounded-card bg-surface p-2 shadow-ambient ring-1 ring-hairline">
            <EmptyState
              icon="library_books"
              title="No subjects added yet"
              message="Add your subjects or import a timetable to begin tracking your attendance."
              action={
                <Link
                  to="/profile/subjects"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-pill bg-brand-600 px-5 text-label-lg text-white shadow-elevated"
                >
                  <Icon name="add" size={18} />
                  Add subjects
                </Link>
              }
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-card bg-surface p-2 shadow-ambient ring-1 ring-hairline">
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
          <section className="flex items-start gap-3.5 rounded-card bg-brand-50 p-4 shadow-ambient ring-1 ring-brand-500/10">
            <IconTile icon="auto_awesome" tone="indigo" size={40} iconSize={20} />
            <div className="min-w-0">
              <p className="text-label-lg text-brand-700">Proactive Planner</p>
              <p className="mt-0.5 text-body-sm text-brand-700/85">
                Attend{' '}
                {nextClass
                  ? `${nextClass.date === new Date().toISOString().slice(0, 10) ? 'today’s' : 'the next'} ${planner.recovery.classes}`
                  : `the next ${planner.recovery.classes}`}{' '}
                {planner.subject.shortName} {planner.recovery.classes === 1 ? 'lecture' : 'lectures'} to jump back
                above {planner.target}%.
              </p>
              <Link
                to={`/attendance/${planner.subject.id}`}
className="mt-2 inline-flex items-center gap-1 text-label-md text-brand-700"
              >
                Recovery plan
                <Icon name="arrow_forward" size={15} />
              </Link>
            </div>
          </section>
        ) : (
          <section className="flex items-start gap-3.5 rounded-card bg-surface p-4 shadow-ambient ring-1 ring-hairline">
            <IconTile icon="shield" tone="emerald" size={40} iconSize={20} />
            <div>
              <p className="text-label-lg">Every subject is above target</p>
              <p className="mt-0.5 text-body-sm text-ink-secondary">
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
    <div className="px-3 text-center">
      <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.03em] text-ink-muted">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </p>
      <p className="mt-1.5 text-headline-sm tabular-nums">{value}</p>
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
          ? 'shrink-0 rounded-pill bg-brand-600 px-4 py-2 text-label-md text-white shadow-elevated'
          : 'shrink-0 rounded-pill bg-surface px-4 py-2 text-label-md text-ink-secondary shadow-ambient ring-1 ring-hairline'
      }
    >
      {label}
    </button>
  );
}

export type { AttendanceHealth };

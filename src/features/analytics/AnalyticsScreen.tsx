import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useClassora } from '@/app/store';
import { useAggregateStats, useSubjectInsights } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/controls';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/chips';
import { EmptyState } from '@/components/ui/feedback';
import { AttendanceHeatmap } from './AttendanceHeatmap';
import {
  buildMonthlyComparison,
  buildTrajectory,
  buildWeeklyReport,
  periodRange,
  type AnalyticsPeriod,
} from './analyticsMath';
import { formatPercent } from '@/lib/attendance';
import { todayKey } from '@/lib/date';

/**
 * Analytics — trend first, then weekly consistency, subject distribution and
 * recovery risk. Charts are customised to the porcelain design language rather
 * than left with library defaults.
 */
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('month');
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const subjects = useClassora((state) => state.subjects);
  const insights = useSubjectInsights();
  const stats = useAggregateStats();
  const profile = useClassora((state) => state.profile);
  const target = profile?.attendanceTarget ?? 75;

  const range = useMemo(() => periodRange(period, todayKey()), [period]);

  const report = useMemo(
    () => buildWeeklyReport(occurrences, attendance, subjects, todayKey()),
    [occurrences, attendance, subjects],
  );

  const trajectory = useMemo(
    () => buildTrajectory(occurrences, attendance, subjects, range, target),
    [occurrences, attendance, subjects, range, target],
  );

  const distribution = useMemo(
    () =>
      insights
        .map((insight) => ({
          insight,
          percentage: insight.summary.percentage ?? 0,
        }))
        .sort((a, b) => b.percentage - a.percentage),
    [insights],
  );

  const mostMissed = useMemo(() => {
    const sorted = [...insights].sort((a, b) => (a.summary.percentage ?? 100) - (b.summary.percentage ?? 100));
    return sorted[0] ?? null;
  }, [insights]);

  const monthComparison = useMemo(
    () => buildMonthlyComparison(occurrences, attendance, subjects, todayKey()),
    [occurrences, attendance, subjects],
  );

  if (stats.conducted === 0) {
    return (
      <>
        <AppHeader title="Analytics" />
        <div className="px-5">
          <Card>
            <EmptyState
              icon="insights"
              title="Attendance insights will appear here"
              message="Once your first classes are marked, Classora builds your trend, subject distribution and recovery guidance."
            />
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="Analytics" />

      <div className="space-y-5 px-5">
        <SegmentedControl<AnalyticsPeriod>
          ariaLabel="Analytics period"
          value={period}
          onChange={setPeriod}
          size="sm"
          options={[
            { value: 'month', label: 'This Month' },
            { value: 'last30', label: 'Last 30 Days' },
            { value: 'semester', label: 'Semester Total' },
          ]}
        />

        <Card>
          <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
            Overall attendance
          </p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-metric-xl tabular-nums">
              {formatPercent(stats.percentage)}
            </span>
            {monthComparison.delta !== null ? (
              <span
                className={
                  monthComparison.delta >= 0
                    ? 'rounded-pill bg-safe-50 px-2.5 py-1 text-label-md text-safe-700'
                    : 'rounded-pill bg-critical-50 px-2.5 py-1 text-label-md text-critical-600'
                }
              >
                {monthComparison.delta >= 0 ? '↗ +' : '↘ '}
                {monthComparison.delta.toFixed(1)}%
              </span>
            ) : null}
          </div>
          {monthComparison.previous !== null ? (
            <p className="mt-1 text-body-sm text-ink-secondary">
              vs {formatPercent(monthComparison.previous)} last month
            </p>
          ) : null}

          <div className="mt-4 grid grid-cols-2 divide-x divide-divider rounded-block border border-divider bg-surface-muted py-3.5">
            <div className="px-3.5">
              <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                <Icon name="calendar_view_week" size={14} className="text-brand-600" />
                This week
              </p>
              <p className="mt-1.5 text-metric-sm tabular-nums">
                {report.attended}
                <span className="text-label-lg text-ink-muted"> / {report.conducted}</span>
              </p>
              <p className="mt-1 text-label-sm text-ink-secondary">
                {report.presenceRate === null ? 'No classes yet' : `${report.presenceRate.toFixed(1)}% presence rate`}
              </p>
            </div>
            <div className="px-3.5">
              <p className="inline-flex items-center gap-1.5 text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                <Icon name="bolt" size={14} className="text-warning-500" />
                Consistency
              </p>
              <p className="mt-1.5 text-metric-sm tabular-nums">{report.consistency}%</p>
              <p className="mt-1 text-label-sm text-ink-secondary">{report.stabilityLabel}</p>
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Attendance Trajectory"
            subtitle={`${trajectory.windowSize}-Week Moving Average`}
            action={
              <span className="inline-flex items-center gap-1.5 text-label-sm font-semibold text-ink-secondary">
                <span className="h-[2px] w-4 rounded-full bg-ink-muted" />
                {target}% Target
              </span>
            }
          />
          {trajectory.points.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-ink-secondary">
              Insights appear after your first marked classes.
            </p>
          ) : (
            <div className="-ml-2 h-[190px] w-[calc(100%+8px)]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trajectory.points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="trajectory-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#EFF0F3" />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF', fontWeight: 600 }}
                    dy={6}
                  />
                  <YAxis
                    domain={trajectory.domain}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    width={44}
                    tickFormatter={(value: number) => `${Math.round(value)}%`}
                  />
                  <ReferenceLine
                    y={target}
                    stroke="#B9BBC6"
                    strokeDasharray="4 4"
                    label={{
                      value: `${target}%`,
                      position: 'insideTopRight',
                      fill: '#9CA3AF',
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 14,
                      border: '1px solid rgba(17,24,39,0.06)',
                      boxShadow: '0 12px 32px -16px rgba(17,24,39,0.24)',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Attendance']}
                  />
                  <Area
                    type="monotone"
                    dataKey="percentage"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    fill="url(#trajectory-fill)"
                    dot={{ r: 4, fill: '#FFFFFF', stroke: '#4F46E5', strokeWidth: 2.5 }}
                    activeDot={{ r: 6, fill: '#4F46E5', stroke: '#FFFFFF', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader
            title="Subject Distribution"
            subtitle={`Mandatory threshold: ${target.toFixed(1)}%`}
            action={
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-sunken text-ink-secondary">
                <Icon name="zoom_out_map" size={17} />
              </span>
            }
          />
          <ul className="space-y-4">
            {distribution.map(({ insight, percentage }) => (
              <li key={insight.subject.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor(insight.status.health) }}
                    />
                    <span className="truncate text-label-lg">{insight.subject.name}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-body-md font-bold tabular-nums">
                      {formatPercent(insight.summary.percentage)}
                    </span>
                    <StatusChip tone={insight.status.health} label={insight.status.label} />
                  </span>
                </div>
                <ProgressBar
                  className="mt-2"
                  value={percentage}
                  tone={insight.status.health}
                  markerAt={insight.target}
                  height={7}
                />
                <div className="mt-1.5 flex items-center justify-between text-label-sm">
                  <span className="text-ink-secondary">
                    {insight.summary.attended} / {insight.summary.conducted} Attended
                  </span>
                  <span
                    className={
                      insight.status.health === 'critical' ? 'font-semibold text-critical-600' : 'text-ink-secondary'
                    }
                  >
                    {insight.status.health === 'critical'
                      ? `Short of goal by ${Math.abs(insight.status.margin).toFixed(1)}%`
                      : insight.status.health === 'warning'
                        ? `Borderline (+${insight.status.margin.toFixed(1)}%)`
                        : `+${insight.status.margin.toFixed(1)}% above minimum`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <AttendanceHeatmap occurrences={occurrences} attendance={attendance} subjects={subjects} />

        {mostMissed && mostMissed.status.health === 'critical' ? (
          <Card className="!border !border-critical-500/15">
            <div className="flex items-start gap-3">
              <IconTile icon="priority_high" tone="rose" size={40} iconSize={20} />
              <div className="min-w-0">
                <p className="text-label-sm uppercase tracking-[0.03em] text-critical-500">
                  Attendance alert
                </p>
                <h3 className="mt-0.5 text-headline-sm">
                  {mostMissed.subject.name}
                </h3>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 divide-x divide-divider rounded-block bg-surface-muted py-3.5">
              <div className="px-3.5">
                <p className="text-label-sm font-semibold text-ink-secondary">Most missed subject</p>
                <p className="mt-1 text-label-lg">
                  {mostMissed.summary.missed} missed{' '}
                  {mostMissed.subject.attendanceCountMode === 'session' ? 'sessions' : 'lectures'}
                </p>
              </div>
              <div className="px-3.5">
                <p className="text-label-sm font-semibold text-ink-secondary">Recovery need</p>
                <p className="mt-1 text-label-lg text-critical-600">
                  +{mostMissed.recovery.classes} Consecutive
                </p>
              </div>
            </div>

            <p className="mt-3.5 text-body-sm text-ink-secondary">
              Attending the next {mostMissed.recovery.classes}{' '}
              {mostMissed.recovery.classes === 1 ? 'class' : 'classes'} will bring{' '}
              {mostMissed.subject.shortName} back to the {mostMissed.target}% benchmark
              {mostMissed.recovery.projected !== null
                ? ` (projected ${mostMissed.recovery.projected.toFixed(1)}%)`
                : ''}
              .
            </p>

            <Link
              to={`/attendance/${mostMissed.subject.id}`}
className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-pill bg-brand-600 text-label-lg text-white shadow-elevated"
            >
              View Recovery Plan
              <Icon name="arrow_forward" size={17} />
            </Link>
          </Card>
        ) : null}

        <Card className="!p-4">
          <div className="flex items-center gap-3.5">
            <IconTile icon="verified_user" tone="indigo" size={40} iconSize={20} />
            <div className="min-w-0 flex-1">
              <p className="text-label-lg">Streak Protector</p>
              <p className="truncate text-body-sm text-ink-secondary">
                {report.nextClassLabel ??
                  'Mark attendance after each class to keep your data complete.'}
              </p>
            </div>
            <Link to="/attendance/review" aria-label="Open attendance review">
              <Icon name="chevron_right" size={20} className="text-ink-muted" />
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}

function dotColor(health: string): string {
  if (health === 'safe') return '#10B981';
  if (health === 'warning') return '#F59E0B';
  if (health === 'critical') return '#EF4444';
  return '#9CA3AF';
}



import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useClassora } from '@/app/store';
import { useNow, useSubjectInsights } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button, Field, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/chips';
import { simulateLeave, type LeaveSimulationInput } from '@/lib/attendance';
import { formatLongDate, formatTimeRange, timeToMinutes, todayKey } from '@/lib/date';
import { isCountable } from '@/lib/attendance';

type LeaveScope = 'full' | 'morning' | 'afternoon' | 'custom';

const SCOPES: { value: LeaveScope; label: string }[] = [
  { value: 'full', label: 'Full day' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'custom', label: 'Custom time' },
];

/**
 * Leave impact simulator — a preview only. Nothing here is ever persisted.
 */
export function LeaveImpactScreen() {
  const navigate = useNavigate();
  const insights = useSubjectInsights();
  const occurrences = useClassora((state) => state.occurrences);
  const now = useNow();

  const [date, setDate] = useState(todayKey());
  const [scope, setScope] = useState<LeaveScope>('full');
  const [untilTime, setUntilTime] = useState('12:30');

  const dayOccurrences = useMemo(
    () =>
      occurrences
        .filter((occurrence) => occurrence.date === date && isCountable(occurrence))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [occurrences, date],
  );

  const affected = useMemo(() => {
    return dayOccurrences.filter((occurrence) => {
      if (scope === 'full') return true;
      if (scope === 'morning') return timeToMinutes(occurrence.startTime) < 12 * 60;
      if (scope === 'afternoon') return timeToMinutes(occurrence.startTime) >= 12 * 60;
      // Custom: everything starting before the chosen time.
      return timeToMinutes(occurrence.startTime) < timeToMinutes(untilTime);
    });
  }, [dayOccurrences, scope, untilTime]);

  const result = useMemo(() => {
    const inputs: LeaveSimulationInput[] = insights.map((insight) => {
      const units = affected
        .filter((occurrence) => occurrence.subjectId === insight.subject.id)
        .reduce(
          (total, occurrence) =>
            total +
            (insight.subject.attendanceCountMode === 'session' ? 1 : Math.max(1, occurrence.periodCount)),
          0,
        );
      return {
        subject: insight.subject,
        summary: insight.summary,
        affectedUnits: units,
        globalTarget: insight.target,
      };
    });

    return simulateLeave(date, inputs);
  }, [insights, affected, date]);

  return (
    <>
      <AppHeader
        title="Leave Impact"
        subtitle="Simulate a day off"
        showActions={false}
        leading={
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-ambient ring-1 ring-black/[0.04]"
          >
            <Icon name="arrow_back" size={19} />
          </button>
        }
      />

      <div className="space-y-4 px-5">
        <Card>
          <SectionHeader title="Pick a date and leave window" subtitle="Simulation only — nothing is saved." />
          <div className="space-y-3.5">
            <Field label="Date">
              <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            </Field>

            <div className="flex flex-wrap gap-2">
              {SCOPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScope(option.value)}
                  aria-pressed={scope === option.value}
                  className={cn(
                    'rounded-pill px-4 py-2 text-[12.5px] font-bold transition',
                    scope === option.value
                      ? 'bg-brand-600 text-white shadow-elevated'
                      : 'bg-surface-sunken text-ink-secondary',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {scope === 'custom' ? (
              <Field label="Leave until" hint="Classes starting before this time are included">
                <TextInput
                  type="time"
                  value={untilTime}
                  onChange={(event) => setUntilTime(event.target.value)}
                />
              </Field>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title={formatLongDate(date)}
            subtitle={`${affected.length} ${affected.length === 1 ? 'class' : 'classes'} in this window`}
          />
          {dayOccurrences.length === 0 ? (
            <p className="text-[13px] text-ink-secondary">No classes are scheduled on this date.</p>
          ) : (
            <ul className="space-y-2">
              {dayOccurrences.map((occurrence) => {
                const subject = insights.find((item) => item.subject.id === occurrence.subjectId)?.subject;
                const included = affected.some((item) => item.id === occurrence.id);
                return (
                  <li
                    key={occurrence.id}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-block px-3.5 py-3',
                      included ? 'bg-critical-50' : 'bg-surface-muted',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">
                        {subject?.name ?? 'Class'}
                      </span>
                      <span className="block text-[12px] text-ink-secondary">
                        {formatTimeRange(occurrence.startTime, occurrence.endTime)}
                        {occurrence.room ? ` • ${occurrence.room}` : ''}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'shrink-0 rounded-pill px-2.5 py-1 text-[11px] font-bold',
                        included ? 'bg-critical-500 text-white' : 'bg-surface-sunken text-ink-secondary',
                      )}
                    >
                      {included ? 'Affected' : 'Not counted'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {result.lines.length > 0 ? (
          <>
            <Card>
              <SectionHeader title="Projected impact" subtitle="Before → after, per subject" />
              <ul className="space-y-4">
                {result.lines.map((line) => (
                  <li key={line.subjectId}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[14px] font-bold">{line.subjectName}</span>
                      <StatusChip
                        tone={line.healthAfter}
                        label={line.healthAfter === 'critical' ? 'Below Target' : 'Still safe'}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                      <span className="text-ink-secondary">
                        {line.before === null ? '—' : `${line.before.toFixed(1)}%`}
                      </span>
                      <Icon name="arrow_forward" size={15} className="text-ink-muted" />
                      <span
                        className={
                          line.healthAfter === 'critical' ? 'font-extrabold text-critical-600' : 'text-ink'
                        }
                      >
                        {line.after === null ? '—' : `${line.after.toFixed(1)}%`}
                      </span>
                      <span
                        className={
                          line.delta >= 0 ? 'text-safe-700' : 'ml-auto text-critical-600'
                        }
                      >
                        {line.delta >= 0 ? '+' : ''}
                        {line.delta.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar
                      className="mt-2"
                      value={line.after ?? 0}
                      tone={line.healthAfter === 'critical' ? 'critical' : line.healthAfter === 'warning' ? 'warning' : 'safe'}
                      height={7}
                      animate={false}
                    />
                  </li>
                ))}
              </ul>
            </Card>

            <section
              className={cn(
                'rounded-card p-5 shadow-ambient ring-1',
                result.newlyBreaking.length > 0
                  ? 'bg-critical-50 ring-critical-500/15'
                  : 'bg-safe-50 ring-safe-500/15',
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-full text-white',
                    result.newlyBreaking.length > 0 ? 'bg-critical-500' : 'bg-safe-500',
                  )}
                >
                  <Icon name={result.newlyBreaking.length > 0 ? 'warning' : 'check'} size={19} />
                </span>
                <div>
                  <p
                    className={cn(
                      'text-[15px] font-extrabold',
                      result.newlyBreaking.length > 0 ? 'text-critical-700' : 'text-safe-700',
                    )}
                  >
                    {result.newlyBreaking.length > 0
                      ? `${result.newlyBreaking.length} ${
                          result.newlyBreaking.length === 1 ? 'subject' : 'subjects'
                        } drop below target`
                      : 'Every subject stays above target'}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-secondary">
                    {result.lines.length - result.belowTargetAfter.length} subjects remain safe ·{' '}
                    {result.totalClasses} attendance {result.totalClasses === 1 ? 'unit' : 'units'} affected
                  </p>
                </div>
              </div>

              {result.newlyBreaking.length > 0 ? (
                <ul className="mt-3 space-y-1">
                  {result.newlyBreaking.map((name) => (
                    <li key={name} className="flex items-center gap-2 text-[12.5px] font-semibold text-critical-700">
                      <Icon name="trending_down" size={15} />
                      {name}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          </>
        ) : (
          <Card>
            <p className="text-[13px] text-ink-secondary">
              Nothing would be affected in this window. Try a different date or leave window.
            </p>
          </Card>
        )}

        <div className="flex flex-col gap-2.5 pb-2 sm:flex-row">
          <Button block variant="secondary" icon="event" onClick={() => setDate(todayKey())}>
            Reset to today
          </Button>
          <Button block icon="arrow_back" onClick={() => navigate(-1)}>
            Back to simulator
          </Button>
        </div>

        <p className="px-1 pb-2 text-center text-[11.5px] text-ink-muted">
          Simulated for {formatLongDate(date)} · current time {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { useNow, useSubjectInsights } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card } from '@/components/ui/Card';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button, Field, SelectInput, TextInput } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/chips';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { EmptyState } from '@/components/ui/feedback';
import { formatPercent, projectWithNextClass } from '@/lib/attendance';
import { formatLongDate, formatTimeRange, todayKey } from '@/lib/date';
import type { ClassOccurrence } from '@/types/domain';

/**
 * "Can I Skip?" — the predictive simulator.
 *
 * Every projection is computed from the student's own attendance units; the
 * language describes the maths and never pretends to be an academic ruling.
 */
export function CanISkipScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const insights = useSubjectInsights();
  const now = useNow();
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  const requestedSubject = params.get('subject');

  /** The next countable class — the slot the decision is about. */
  const target = useMemo(() => {
    const upcoming = insights
      .flatMap((insight) =>
        insight.upcoming.map((occurrence) => ({ insight, occurrence })),
      )
      .filter(({ occurrence }) => new Date(occurrence.endDateTime).getTime() > now.getTime())
      .sort((a, b) => a.occurrence.startDateTime.localeCompare(b.occurrence.startDateTime));

    if (requestedSubject) {
      const preferred = upcoming.find(({ insight }) => insight.subject.id === requestedSubject);
      if (preferred) return preferred;
    }
    return upcoming[0] ?? null;
  }, [insights, now, requestedSubject]);

  const scenario = useMemo(() => {
    if (!target) return null;
    const { insight } = target;
    const upcomingWeights = insight.upcoming.map((occurrence) =>
      insight.subject.attendanceCountMode === 'session' ? 1 : Math.max(1, occurrence.periodCount),
    );
    const context = { summary: insight.summary, target: insight.target, upcomingWeights };

    return {
      present: projectWithNextClass(context, 'present'),
      absent: projectWithNextClass(context, 'absent'),
      nextWeight: upcomingWeights[0] ?? 1,
    };
  }, [target]);

  /** A second, contrasting subject so the screen is useful immediately. */
  const alternate = useMemo(() => {
    if (!target) return null;
    const candidates = insights
      .filter((insight) => insight.subject.id !== target.insight.subject.id && insight.upcoming.length > 0)
      .sort(
        (a, b) =>
          (a.summary.percentage ?? 100) - (b.summary.percentage ?? 100),
      );
    const worst = candidates[0];
    if (!worst) return null;

    const upcomingWeights = worst.upcoming.map((occurrence) =>
      worst.subject.attendanceCountMode === 'session' ? 1 : Math.max(1, occurrence.periodCount),
    );
    const projected = projectWithNextClass(
      { summary: worst.summary, target: worst.target, upcomingWeights },
      'absent',
    );
    return { insight: worst, occurrence: worst.upcoming[0]!, projected };
  }, [insights, target]);

  if (!target || !scenario) {
    return (
      <>
        <AppHeader
          title="Can I Skip"
          subtitle="Decision engine"
          showActions={false}
          leading={<BackButton onClick={() => navigate(-1)} />}
        />
        <div className="px-5">
          <Card>
            <EmptyState
              icon="event_busy"
              title="No upcoming classes to simulate"
              message="There are no scheduled classes left in this semester, so there is nothing to project right now."
            />
          </Card>
        </div>
      </>
    );
  }

  const { insight, occurrence } = target;
  const current = insight.summary.percentage ?? 0;
  const absentPercentage = scenario.absent.percentage ?? 0;
  const presentPercentage = scenario.present.percentage ?? 0;
  const verdict = verdictFor(absentPercentage, insight.target);
  const confidence = reliabilityFor(insight.summary.confidence);

  return (
    <>
      <AppHeader
        title="Can I Skip"
        subtitle="Predictive Class Attendance Simulator"
        showActions={false}
        leading={<BackButton onClick={() => navigate(-1)} />}
      />

      <div className="space-y-4 px-5">
        {/* Upcoming slot ------------------------------------------------ */}
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">Upcoming class</p>
            <span className="inline-flex items-center gap-1.5 text-label-md text-ink-secondary">
              <Icon name="schedule" size={15} />
              {countdownLabel(occurrence, now)}
            </span>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-headline-md">
                {insight.subject.name}
              </h2>
              <p className="mt-1 inline-flex items-center gap-1.5 text-body-sm text-ink-secondary">
                <Icon name="calendar_today" size={15} />
                {occurrence.date === todayKey() ? 'Today' : formatLongDate(occurrence.date)} •{' '}
                {formatTimeRange(occurrence.startTime, occurrence.endTime)}
              </p>
            </div>
            <SubjectGlyph subject={insight.subject} size={46} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-block bg-surface-muted p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-label-md text-brand-700 shadow-ambient">
                {initialsOf(insight.subject.faculty ?? insight.subject.shortName)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-label-lg">
                  {insight.subject.faculty ?? 'Faculty TBA'}
                </span>
                <span className="block text-label-sm text-ink-secondary">Faculty • Dept of CS</span>
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-block bg-surface-muted p-3">
              <Icon name="meeting_room" size={18} className="text-ink-muted" />
              <span className="min-w-0">
                <span className="block text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                  Room
                </span>
                <span className="block truncate text-label-lg">{occurrence.room ?? 'TBA'}</span>
              </span>
            </div>
          </div>
        </Card>

        {/* Verdict ------------------------------------------------------ */}
        <section
          className={cn(
            'rounded-card p-5 shadow-ambient ring-1',
            verdict.tone === 'safe' && 'bg-gradient-to-b from-safe-50 to-surface ring-safe-500/15',
            verdict.tone === 'warning' && 'bg-gradient-to-b from-warning-50 to-surface ring-warning-500/15',
            verdict.tone === 'critical' && 'bg-gradient-to-b from-critical-50 to-surface ring-critical-500/15',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-pill px-3.5 py-2 text-label-md',
                verdict.tone === 'safe' && 'bg-safe-600 text-white',
                verdict.tone === 'warning' && 'bg-warning-500 text-white',
                verdict.tone === 'critical' && 'bg-critical-500 text-white',
              )}
            >
              <Icon name={verdict.icon} size={16} filled />
              {verdict.label}
            </span>
            <span className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
              Reliability {confidence}%
            </span>
          </div>

          <h3
            className={cn(
              'mt-3.5 text-headline-sm',
              verdict.tone === 'safe' && 'text-safe-700',
              verdict.tone === 'warning' && 'text-warning-700',
              verdict.tone === 'critical' && 'text-critical-700',
            )}
          >
            {verdict.headline(absentPercentage, insight.target)}
          </h3>
          <p className="mt-1.5 text-body-md text-ink-secondary">{verdict.body}</p>

          <div className="mt-4 grid grid-cols-2 divide-x divide-divider rounded-block bg-white/70 py-3.5">
            <div className="px-3.5">
              <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                Buffer runway
              </p>
              <p className="mt-1 text-body-lg font-bold">
                {scenario.absent.safeMisses} {scenario.absent.safeMisses === 1 ? 'Class' : 'Classes'}
              </p>
              <p className="text-label-sm text-ink-secondary">Safe misses remaining</p>
            </div>
            <div className="px-3.5">
              <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                Projected score
              </p>
              <p className="mt-1 text-body-lg font-bold tabular-nums">{formatPercent(absentPercentage)}</p>
              <p className="text-label-sm text-ink-secondary">Min required: {insight.target}%</p>
            </div>
          </div>
        </section>

        {/* Current attendance + both projections ------------------------ */}
        <Card>
          <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
            Current attendance
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <span className="text-metric-xl tabular-nums">
              {formatPercent(current)}
            </span>
            <span className="pb-1 text-right">
              <span className="block text-label-md text-ink-secondary">
                {standingLabel(current, insight.target)}
              </span>
              <span className="block text-label-md text-ink-muted">
                Attended {insight.summary.attended} / {insight.summary.conducted}
              </span>
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            <ProjectionBlock
              label="If present"
              percentage={presentPercentage}
              delta={scenario.present.delta}
              attended={scenario.present.attended}
              conducted={scenario.present.conducted}
              tone="safe"
              note={
                scenario.present.safeMisses > 0
                  ? `Safe buffer climbs to ${scenario.present.safeMisses} ${
                      scenario.present.safeMisses === 1 ? 'class' : 'classes'
                    }`
                  : 'Buffer stays at zero'
              }
            />
            <ProjectionBlock
              label="If absent"
              percentage={absentPercentage}
              delta={scenario.absent.delta}
              attended={scenario.absent.attended}
              conducted={scenario.absent.conducted}
              tone={absentPercentage < insight.target ? 'critical' : absentPercentage - insight.target <= 5 ? 'warning' : 'neutral'}
              note={
                absentPercentage >= insight.target
                  ? `Still +${(absentPercentage - insight.target).toFixed(1)}% above safety margin`
                  : `Falls ${(insight.target - absentPercentage).toFixed(1)}% below target`
              }
            />
          </div>

          <div className="mt-3.5 flex items-center justify-between text-label-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-critical-500" />
              Min. target: {insight.target.toFixed(1)}%
            </span>
            <span className="text-ink-muted">
              {insight.subject.subjectCode ? `${insight.subject.subjectCode} syllabus` : 'Semester scope'}
            </span>
          </div>
        </Card>

        {/* Alternate scenario ------------------------------------------ */}
        {alternate ? (
          <Card>
            <div className="flex items-center justify-between">
              <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                Other scenarios
              </p>
              <StatusChip
                tone={(alternate.projected.percentage ?? 0) < alternate.insight.target ? 'critical' : 'warning'}
                label={
                  (alternate.projected.percentage ?? 0) < alternate.insight.target ? 'Critical risk' : 'Watch'
                }
              />
            </div>

            <div className="mt-3 flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px] bg-critical-50 text-critical-500">
                <Icon name="warning" size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-body-lg font-bold">
                  What if you skip {alternate.insight.subject.shortName}?
                </p>
                <p className="mt-0.5 text-body-sm text-ink-secondary">
                  {formatLongDate(alternate.occurrence.date)} • {alternate.occurrence.startTime} •{' '}
                  {alternate.insight.subject.faculty ?? 'Faculty TBA'}
                </p>
              </div>
            </div>

            <div className="mt-3.5 rounded-block bg-critical-50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-label-md text-critical-700">Projected attendance</span>
                <span className="text-headline-sm tabular-nums text-critical-700">
                  {formatPercent(alternate.projected.percentage)}
                </span>
              </div>
              <p className="mt-1.5 text-body-sm text-critical-700/90">
                {(alternate.projected.percentage ?? 0) < alternate.insight.target
                  ? `Falls ${(alternate.insight.target - (alternate.projected.percentage ?? 0)).toFixed(1)}% below the ${
                      alternate.insight.target
                    }% target. This is the maths of your current records, not a college ruling.`
                  : `Stays above the ${alternate.insight.target}% target, but with little room left.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/attendance/${alternate.insight.subject.id}`)}
className="mt-3.5 inline-flex items-center gap-1.5 text-label-lg text-brand-700"
            >
              Open {alternate.insight.subject.shortName} recovery plan
              <Icon name="arrow_forward" size={15} />
            </button>
          </Card>
        ) : null}

        {/* Contextual tiles (design placeholders in the reference) ------ */}
        <div className="grid grid-cols-2 gap-3">
          <InfoTile
            icon="meeting_room"
            label="Room"
            value={occurrence.room ?? 'TBA'}
            caption={`${insight.subject.classType === 'lab' ? 'Lab block' : 'Lecture'} • ${insight.subject.attendanceCountMode === 'session' ? '1 session' : 'per period'}`}
          />
          <InfoTile
            icon="insights"
            label="Semester"
            value={formatPercent(current)}
            caption={
              current >= insight.target ? 'Full term above target' : 'Recovery in progress'
            }
          />
        </div>

        <div className="space-y-2.5 pb-2">
          <Button block icon="calendar_month" onClick={() => navigate('/leave-impact')}>
            Simulate Full Day Leave
          </Button>
          <Button block variant="secondary" icon="calculate" onClick={() => setCalculatorOpen(true)}>
            Custom What-If Calculator
          </Button>
        </div>
      </div>

      <WhatIfCalculator
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        defaultSubjectId={insight.subject.id}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Helpers                                                             *
 * ------------------------------------------------------------------ */

function verdictFor(percentage: number, target: number) {
  const margin = percentage - target;
  if (percentage < target) {
    return {
      tone: 'critical' as const,
      icon: 'dangerous',
      label: 'Not Recommended',
      headline: (value: number, goal: number) =>
        `This drops you ${(goal - value).toFixed(1)}% below target`,
      body: 'Skipping this class puts the subject below the target you configured. The projection uses your recorded attendance only.',
    };
  }
  if (margin <= 5) {
    return {
      tone: 'warning' as const,
      icon: 'priority_high',
      label: 'Borderline',
      headline: (value: number, goal: number) =>
        `You would sit just ${(value - goal).toFixed(1)}% above target`,
      body: 'It is mathematically possible, but your buffer would be thin. Missing another class in a row would likely push the subject below target.',
    };
  }
  return {
    tone: 'safe' as const,
    icon: 'verified',
    label: 'Safe to Skip',
    headline: (value: number, goal: number) =>
      `You will remain ${(value - goal).toFixed(1)}% above target`,
    body: 'Skipping keeps the subject average comfortably above your threshold, based on your recorded attendance.',
  };
}

function reliabilityFor(confidence: number): number {
  // Data confidence maps to how reliable a projection is.
  return Math.round(Math.min(99.9, Math.max(60, confidence)) * 10) / 10;
}

function standingLabel(percentage: number, target: number): string {
  if (percentage < target) return 'Recovery needed';
  if (percentage - target <= 5) return 'Thin margin';
  return 'Healthy standing';
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter((part) => /^[A-Za-z]/.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function countdownLabel(occurrence: ClassOccurrence, now: Date): string {
  const start = new Date(occurrence.startDateTime).getTime();
  const minutes = Math.round((start - now.getTime()) / 60000);
  if (minutes <= 0) return 'In progress';
  if (minutes < 60) return `In ${minutes} mins`;
  const hours = Math.floor(minutes / 60);
  return `In ${hours} h ${minutes % 60} m`;
}

function InfoTile({
  icon,
  label,
  value,
  caption,
}: {
  icon: string;
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-card bg-gradient-to-br from-brand-50 to-surface p-3.5 shadow-ambient ring-1 ring-hairline">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/80 text-brand-600 shadow-ambient">
        <Icon name={icon} size={18} />
      </span>
      <p className="mt-2.5 text-label-sm uppercase tracking-[0.03em] text-ink-muted">{label}</p>
      <p className="text-body-lg font-bold">{value}</p>
      <p className="mt-0.5 text-label-sm text-ink-secondary">{caption}</p>
    </div>
  );
}

function ProjectionBlock({
  label,
  percentage,
  delta,
  attended,
  conducted,
  tone,
  note,
}: {
  label: string;
  percentage: number;
  delta: number;
  attended: number;
  conducted: number;
  tone: 'safe' | 'warning' | 'critical' | 'neutral';
  note: string;
}) {
  const dot =
    tone === 'safe' ? 'bg-safe-500' : tone === 'warning' ? 'bg-warning-500' : tone === 'critical' ? 'bg-critical-500' : 'bg-ink-muted';

  return (
    <div className="rounded-block bg-surface-muted p-3.5">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-label-sm uppercase tracking-[0.03em] text-ink-muted">
          <span className={cn('h-2 w-2 rounded-full', dot)} />
          {label}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-body-lg font-bold tabular-nums">{percentage.toFixed(1)}%</span>
          <span
            className={cn(
              'rounded-pill px-2 py-0.5 text-label-sm font-bold',
              delta >= 0 ? 'bg-safe-50 text-safe-700' : 'bg-critical-50 text-critical-600',
            )}
          >
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        </span>
      </div>
      <ProgressBar className="mt-2" value={percentage} tone={tone === 'neutral' ? 'warning' : tone} height={7} animate={false} />
      <div className="mt-2 flex items-center justify-between text-label-sm">
        <span className="text-ink-secondary">
          {attended} of {conducted} sessions
        </span>
        <span className="text-ink-secondary">{note}</span>
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back"
      className="grid h-11 w-11 place-items-center rounded-full bg-surface text-ink shadow-ambient ring-1 ring-hairline"
    >
      <Icon name="arrow_back" size={19} />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Custom what-if calculator                                           *
 * ------------------------------------------------------------------ */

function WhatIfCalculator({
  open,
  onClose,
  defaultSubjectId,
}: {
  open: boolean;
  onClose: () => void;
  defaultSubjectId: string;
}) {
  const insights = useSubjectInsights();
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [mode, setMode] = useState<'miss' | 'attend'>('miss');
  const [count, setCount] = useState(2);

  const insight = insights.find((item) => item.subject.id === subjectId) ?? insights[0] ?? null;

  const result = useMemo(() => {
    if (!insight) return null;
    let attended = insight.summary.attended;
    let conducted = insight.summary.conducted;
    let classes = 0;

    for (const occurrence of insight.upcoming) {
      if (classes >= count) break;
      const weight =
        insight.subject.attendanceCountMode === 'session' ? 1 : Math.max(1, occurrence.periodCount);
      conducted += weight;
      if (mode === 'attend') attended += weight;
      classes += 1;
    }

    const percentage = conducted > 0 ? (attended / conducted) * 100 : null;
    return { attended, conducted, percentage, classes };
  }, [insight, mode, count]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Custom What-If Calculator"
      description="Simulate any number of future classes. Nothing is saved."
      footer={
        <Button block onClick={onClose}>
          Done
        </Button>
      }
    >
      {insight && result ? (
        <div className="space-y-3.5 pt-1">
          <Field label="Subject">
            <SelectInput value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              {insights.map((item) => (
                <option key={item.subject.id} value={item.subject.id}>
                  {item.subject.name}
                </option>
              ))}
            </SelectInput>
          </Field>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('miss')}
              aria-pressed={mode === 'miss'}
              className={
                mode === 'miss'
                  ? 'flex-1 rounded-pill bg-critical-50 px-4 py-2.5 text-label-lg text-critical-600'
                  : 'flex-1 rounded-pill bg-surface-sunken px-4 py-2.5 text-label-lg text-ink-secondary'
              }
            >
              What if I miss
            </button>
            <button
              type="button"
              onClick={() => setMode('attend')}
              aria-pressed={mode === 'attend'}
              className={
                mode === 'attend'
                  ? 'flex-1 rounded-pill bg-safe-50 px-4 py-2.5 text-label-lg text-safe-700'
                  : 'flex-1 rounded-pill bg-surface-sunken px-4 py-2.5 text-label-lg text-ink-secondary'
              }
            >
              What if I attend
            </button>
          </div>

          <Field label="Next classes" hint="Up to 10 future classes of this subject">
            <TextInput
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(event) => setCount(Math.max(1, Math.min(10, Number(event.target.value) || 1)))}
            />
          </Field>

          <div className="rounded-block bg-surface p-4 shadow-ambient ring-1 ring-hairline">
            <p className="text-body-sm text-ink-secondary">
              If you {mode === 'miss' ? 'miss' : 'attend'} the next {result.classes}{' '}
              {result.classes === 1 ? 'class' : 'classes'} of {insight.subject.shortName}:
            </p>
            <div className="mt-2.5 flex items-end justify-between">
              <span className="text-headline-lg tabular-nums">
                {formatPercent(result.percentage)}
              </span>
              <StatusChip
                tone={
                  (result.percentage ?? 0) >= insight.target
                    ? (result.percentage ?? 0) - insight.target <= 5
                      ? 'warning'
                      : 'safe'
                    : 'critical'
                }
                label={
                  (result.percentage ?? 0) >= insight.target
                    ? (result.percentage ?? 0) - insight.target <= 5
                      ? 'Borderline'
                      : 'Safe'
                    : 'Below target'
                }
              />
            </div>
            <p className="mt-2 text-label-md text-ink-secondary">
              {result.attended} attended of {result.conducted} conducted • target {insight.target}%
            </p>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  );
}



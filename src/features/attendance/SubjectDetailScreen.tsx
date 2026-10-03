import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useRecoveryForecast, useSubjectInsights, useNow } from '@/hooks/useScheduleData';
import { AppHeader } from '@/components/layout/AppHeader';
import { Card, SectionHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/controls';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/chips';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { EmptyState } from '@/components/ui/feedback';
import { occurrenceState } from '@/lib/occurrenceState';
import { formatMediumDate, formatTimeRange } from '@/lib/date';
import { identity } from '@/lib/values';

/**
 * Subject detail — attendance maths, safe misses, recovery and full history,
 * including extra and replacement classes.
 */
export function SubjectDetailScreen() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const insights = useSubjectInsights();
  const forecast = useRecoveryForecast(subjectId ?? null);
  const occurrences = useClassora((state) => state.occurrences);
  const attendance = useClassora((state) => state.attendance);
  const now = useNow();

  const insight = insights.find((item) => item.subject.id === subjectId) ?? null;

  const history = useMemo(() => {
    if (!insight) return [];
    return occurrences
      .filter((occurrence) => occurrence.subjectId === insight.subject.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
  }, [occurrences, insight]);

  if (!insight) {
    return (
      <>
        <AppHeader title="Subject" showActions={false} leading={<BackButton onClick={() => navigate(-1)} />} />
        <div className="px-5">
          <Card>
            <EmptyState
              icon="search_off"
              title="Subject not found"
              message="This subject may have been archived. Open Manage Subjects to see all subjects."
              action={
                <Link to="/profile/subjects" className="text-label-lg text-brand-700">
                  Manage subjects
                </Link>
              }
            />
          </Card>
        </div>
      </>
    );
  }

  const { subject, summary, status, target, safeMisses, recovery } = insight;
  const percentage = summary.percentage ?? 0;

  const projectedPresent = (() => {
    const weight = insight.upcoming[0]
      ? insight.subject.attendanceCountMode === 'session'
        ? 1
        : Math.max(1, insight.upcoming[0].periodCount)
      : 1;
    if (summary.conducted + weight === 0) return null;
    return ((summary.attended + weight) / (summary.conducted + weight)) * 100;
  })();
  const projectedAbsent = (() => {
    const weight = insight.upcoming[0]
      ? insight.subject.attendanceCountMode === 'session'
        ? 1
        : Math.max(1, insight.upcoming[0].periodCount)
      : 1;
    if (summary.conducted + weight === 0) return null;
    return (summary.attended / (summary.conducted + weight)) * 100;
  })();

  return (
    <>
      <AppHeader
        title="Subject"
        showActions={false}
        leading={<BackButton onClick={() => navigate(-1)} />}
      />

      <div className="space-y-5 px-5">
        <Card>
          <div className="flex items-start gap-3.5">
            <SubjectGlyph subject={subject} size={52} />
            <div className="min-w-0 flex-1">
              <h2 className="text-headline-sm">
                {subject.name}
              </h2>
              <p className="mt-1 text-body-sm text-ink-secondary">
                {[subject.subjectCode, subject.faculty, subject.defaultRoom].filter(identity).join(' • ')}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusChip tone={status.health} label={status.label} />
                <StatusChip
                  tone="neutral"
                  label={subject.attendanceCountMode === 'session' ? 'One session' : 'Individual periods'}
                  showDot={false}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-end justify-between">
            <div>
              <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
                Current attendance
              </p>
              <p className="mt-1 text-metric-xl tabular-nums">
                {summary.percentage === null ? '—' : `${percentage.toFixed(1)}%`}
              </p>
            </div>
            <p className="pb-1 text-label-md text-ink-secondary">Target {target}%</p>
          </div>

          <ProgressBar className="mt-3" value={percentage} tone={status.health} markerAt={target} height={8} />

          <div className="mt-4 grid grid-cols-4 gap-2 rounded-block border border-divider bg-surface-muted py-3">
            <MiniStat label="Attended" value={summary.attended} />
            <MiniStat label="Missed" value={summary.missed} />
            <MiniStat label="Conducted" value={summary.conducted} />
            <MiniStat label="Cancelled" value={summary.cancelledClasses} />
          </div>
        </Card>

        <Card>
          <SectionHeader title="Projection" subtitle="If you attend versus miss the next class" />
          <div className="space-y-2.5">
            <ProjectionRow
              label="If present"
              value={projectedPresent}
              delta={projectedPresent !== null ? projectedPresent - percentage : null}
              tone="safe"
              note={
                projectedPresent !== null && projectedPresent >= target
                  ? 'Stays above target'
                  : 'Still below target'
              }
            />
            <ProjectionRow
              label="If absent"
              value={projectedAbsent}
              delta={projectedAbsent !== null ? projectedAbsent - percentage : null}
              tone={projectedAbsent !== null && projectedAbsent < target ? 'critical' : 'warning'}
              note={
                projectedAbsent !== null && projectedAbsent >= target
                  ? `Still ${(projectedAbsent - target).toFixed(1)}% above target`
                  : 'Would fall below target'
              }
            />
          </div>

          <div className="mt-4 rounded-block bg-surface-muted p-3.5">
            <p className="text-label-lg">
              {safeMisses > 0 ? (
                <>
                  Safe misses remaining:{' '}
                  <span className="font-bold text-safe-700">
                    {safeMisses} {safeMisses === 1 ? 'class' : 'classes'}
                  </span>
                </>
              ) : recovery.classes > 0 ? (
                <>
                  Attend{' '}
                  <span className="font-bold text-critical-600">
                    {recovery.classes} {recovery.classes === 1 ? 'class' : 'classes'}
                  </span>{' '}
                  to return to {target}%
                </>
              ) : (
                <>No upcoming classes scheduled for this subject yet.</>
              )}
            </p>
            {forecast?.date && !forecast.unreachable ? (
              <p className="mt-1 text-body-sm text-ink-secondary">
                Attending every upcoming class brings you back to target around{' '}
                <span className="font-semibold text-ink">{formatMediumDate(forecast.date)}</span>.
              </p>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button block icon="bolt" onClick={() => navigate(`/can-i-skip?subject=${subject.id}`)}>
              Can I skip?
            </Button>
            <Button block variant="secondary" icon="edit_calendar" onClick={() => navigate('/timetable')}>
              Modify timetable
            </Button>
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Upcoming classes"
            action={<span className="text-label-md text-ink-secondary">{insight.upcoming.length}</span>}
          />
          {insight.upcoming.length === 0 ? (
            <p className="text-body-sm text-ink-secondary">
              No scheduled classes left this term for {subject.shortName}.
            </p>
          ) : (
            <ul className="space-y-2">
              {insight.upcoming.slice(0, 5).map((occurrence) => (
                <li key={occurrence.id} className="flex items-center justify-between rounded-block bg-surface-muted px-3.5 py-3">
                  <span>
                    <span className="block text-label-lg">{formatMediumDate(occurrence.date)}</span>
                    <span className="block text-label-md text-ink-secondary">
                      {formatTimeRange(occurrence.startTime, occurrence.endTime)}
                      {occurrence.room ? ` • ${occurrence.room}` : ''}
                    </span>
                  </span>
                  {occurrence.occurrenceType !== 'regular' ? (
                    <StatusChip
                      tone="upcoming"
                      label={occurrence.occurrenceType === 'extra' ? 'Extra' : 'Replacement'}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHeader title="Attendance history" subtitle="Most recent first" />
          <ul className="space-y-2">
            {history.slice(0, 25).map((occurrence) => {
              const record = attendance.find((item) => item.occurrenceId === occurrence.id);
              const info = occurrenceState(occurrence, now, record?.status);
              return (
                <li key={occurrence.id} className="flex items-center justify-between gap-3 rounded-block bg-surface-muted px-3.5 py-3">
                  <span className="min-w-0">
                    <span className="block text-label-lg">{formatMediumDate(occurrence.date)}</span>
                    <span className="block text-label-md text-ink-secondary">
                      {formatTimeRange(occurrence.startTime, occurrence.endTime)}
                      {occurrence.occurrenceType !== 'regular'
                        ? ` • ${occurrence.occurrenceType === 'extra' ? 'Extra class' : 'Replacement'}`
                        : ''}
                    </span>
                  </span>
                  <StatusChip tone={info.tone} label={info.label} icon={info.icon} showDot={!info.icon} />
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-label-md text-ink-muted">
            Corrections are always possible — open a class from the Timetable timeline to change a record.
          </p>
        </Card>
      </div>
    </>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">{label}</p>
      <p className="mt-1 text-body-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}

function ProjectionRow({
  label,
  value,
  delta,
  tone,
  note,
}: {
  label: string;
  value: number | null;
  delta: number | null;
  tone: 'safe' | 'warning' | 'critical';
  note: string;
}) {
  const color = tone === 'safe' ? 'text-safe-700' : tone === 'warning' ? 'text-warning-700' : 'text-critical-600';
  const bg = tone === 'safe' ? 'bg-safe-50' : tone === 'warning' ? 'bg-warning-50' : 'bg-critical-50';

  return (
    <div className={`rounded-block ${bg} p-3.5`}>
      <div className="flex items-center justify-between">
        <span className="text-label-md uppercase tracking-[0.03em] text-ink-muted">{label}</span>
        <span className={`text-body-lg font-bold tabular-nums ${color}`}>
          {value === null ? '—' : `${value.toFixed(1)}%`}
        </span>
      </div>
      <ProgressBar className="mt-2" value={value ?? 0} tone={tone} height={6} animate={false} />
      <div className="mt-2 flex items-center justify-between text-label-sm">
        <span className="text-ink-secondary">{note}</span>
        {delta !== null ? (
          <span className={delta >= 0 ? 'font-semibold text-safe-700' : 'font-semibold text-critical-600'}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}%
          </span>
        ) : null}
      </div>
    </div>
  );
}

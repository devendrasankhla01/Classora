import { Link } from 'react-router-dom';

import { useClassora } from '@/app/store';
import { useSubjectInsights } from '@/hooks/useScheduleData';
import { Icon } from '@/components/ui/Icon';
import { IconTile } from '@/components/ui/controls';
import { formatMediumDate } from '@/lib/date';

/**
 * The deterministic "smart" recommendation on Home.
 *
 * Recovery arithmetic is done with the attendance engine — no AI call is made
 * to divide two numbers. The copy adapts to what actually needs attention.
 */
export function SmartInsightCard() {
  const insights = useSubjectInsights();
  const profile = useClassora((state) => state.profile);
  const target = profile?.attendanceTarget ?? 75;

  const atRisk = insights
    .filter((insight) => insight.summary.percentage !== null && insight.summary.percentage < insight.target)
    .sort((a, b) => (a.summary.percentage ?? 0) - (b.summary.percentage ?? 0));

  const thinMargin = insights
    .filter(
      (insight) =>
        insight.summary.percentage !== null &&
        insight.summary.percentage >= insight.target &&
        insight.safeMisses <= 1,
    )
    .sort((a, b) => a.safeMisses - b.safeMisses);

  const focus = atRisk[0] ?? thinMargin[0] ?? null;

  if (!focus) {
    return (
      <section className="flex items-start gap-3 rounded-card bg-surface p-4 shadow-ambient ring-1 ring-hairline">
        <IconTile icon="verified" tone="emerald" size={38} iconSize={19} />
        <div className="min-w-0">
          <p className="text-label-lg">You’re in the safe zone everywhere</p>
          <p className="mt-0.5 text-body-sm text-ink-secondary">
            Every subject is above your {target}% target with room to spare. Keep marking attendance to keep
            the insight accurate.
          </p>
        </div>
      </section>
    );
  }

  const subject = focus.subject;
  const isRecovery = (focus.summary.percentage ?? 0) < focus.target;
  const projected = focus.recovery.projected;
  const forecastDate = focus.recovery.classes > 0 ? focus.upcoming[focus.recovery.classes - 1]?.date : null;

  return (
    <section className="rounded-card bg-surface p-5 shadow-ambient ring-1 ring-hairline">
      <div className="flex items-center gap-3">
        <IconTile icon={isRecovery ? 'trending_up' : 'shield'} tone={isRecovery ? 'rose' : 'amber'} size={38} iconSize={19} />
        <div>
          <p className="text-label-sm uppercase tracking-[0.03em] text-ink-muted">
            Smart recommendation
          </p>
          <h2 className="text-label-lg">{subject.name}</h2>
        </div>
      </div>

      <p className="mt-3 text-body-md text-ink-secondary">
        {isRecovery ? (
          focus.recovery.unreachable ? (
            <>
              {subject.shortName} is at {focus.summary.percentage?.toFixed(1)}%. The remaining classes this
              term are not enough to reach {focus.target}% on their own — speak to your faculty about
              additional sessions.
            </>
          ) : (
            <>
              {subject.shortName} is at {focus.summary.percentage?.toFixed(1)}%. Attend the next{' '}
              <span className="font-bold text-ink">
                {focus.recovery.classes} {focus.recovery.classes === 1 ? 'class' : 'classes'}
              </span>{' '}
              to return above {focus.target}%
              {projected !== null ? ` (projected ${projected.toFixed(1)}%)` : ''}
              {forecastDate ? ` — around ${formatMediumDate(forecastDate)}` : ''}.
            </>
          )
        ) : (
          <>
            {subject.shortName} is at {focus.summary.percentage?.toFixed(1)}%, only{' '}
            {focus.safeMisses === 0 ? 'no' : focus.safeMisses} {focus.safeMisses === 1 ? 'class' : 'classes'}{' '}
            above the line. Attending the next class protects your {focus.target}% margin.
          </>
        )}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link
          to={`/can-i-skip?subject=${subject.id}`}
className="inline-flex min-h-[42px] items-center gap-2 rounded-pill bg-brand-600 px-4 text-label-lg text-white shadow-elevated"
        >
          <Icon name="bolt" size={17} />
          Can I skip?
        </Link>
        <Link
          to={`/attendance/${subject.id}`}
className="inline-flex min-h-[42px] items-center gap-2 rounded-pill bg-surface-sunken px-4 text-label-lg text-ink-secondary"
        >
          Subject details
        </Link>
      </div>
    </section>
  );
}

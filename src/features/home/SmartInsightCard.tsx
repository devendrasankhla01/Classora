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
  const target = profile?.attendanceTarget ?? 85;

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
      <section className="flex items-start gap-3 rounded-3xl bg-white p-5 shadow-sm border border-slate-100">
        <IconTile icon="verified" tone="emerald" size={38} iconSize={19} />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-slate-900">You’re in the safe zone everywhere</p>
          <p className="mt-0.5 text-xs text-slate-500 font-medium leading-relaxed">
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
    <section className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
      <div className="flex items-center gap-3">
        <IconTile icon={isRecovery ? 'trending_up' : 'shield'} tone={isRecovery ? 'rose' : 'amber'} size={38} iconSize={19} />
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
            Smart recommendation
          </p>
          <h2 className="text-base font-extrabold text-slate-900">{subject.name}</h2>
        </div>
      </div>

      <p className="text-xs text-slate-600 font-medium leading-relaxed">
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
              <span className="font-extrabold text-slate-900">
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

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Link
          to={`/can-i-skip?subject=${subject.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#38B6FF] hover:bg-[#0094e8] px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-sky-500/25 transition active:scale-95"
        >
          <Icon name="bolt" size={17} />
          Can I skip?
        </Link>
        <Link
          to={`/attendance/${subject.id}`}
          className="inline-flex items-center gap-2 rounded-2xl bg-[#F6F8FA] hover:bg-slate-100 px-4 py-2 text-xs font-extrabold text-slate-600 transition"
        >
          Subject details
        </Link>
      </div>
    </section>
  );
}


import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/chips';
import { formatPercent } from '@/lib/attendance';
import type { SubjectInsight } from '@/hooks/useScheduleData';

const PERCENT_TEXT: Record<string, string> = {
  safe: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-rose-600',
  no_data: 'text-slate-400',
};

const FOOTER_BG: Record<string, string> = {
  safe: 'bg-emerald-50/90 text-emerald-800 border-emerald-200/80',
  warning: 'bg-amber-50/90 text-amber-800 border-amber-200/80',
  critical: 'bg-rose-50/90 text-rose-800 border-rose-200/80',
};

/**
 * Subject attendance card: status, percentage, attended/conducted, progress and
 * the subject-specific safe-miss or recovery line.
 */
export function SubjectAttendanceCard({ insight }: { insight: SubjectInsight }) {
  const { subject, summary, safeMisses, recovery, status } = insight;
  const percentage = summary.percentage ?? 0;

  const footer =
    status.health === 'critical'
      ? {
          icon: 'flag',
          badgeClass: FOOTER_BG.critical,
          text:
            recovery.classes > 0
              ? `Needs ${recovery.classes} ${recovery.classes === 1 ? 'class' : 'classes'} to recover`
              : 'Recovery needs more scheduled classes',
        }
      : safeMisses === 0
        ? { icon: 'warning', badgeClass: FOOTER_BG.warning, text: 'Can miss 0 classes (At Risk)' }
        : {
            icon: subject.attendanceCountMode === 'session' ? 'event_available' : 'calendar_month',
            badgeClass: FOOTER_BG.safe,
            text: `Can miss: ${safeMisses} ${safeMisses === 1 ? 'class' : 'classes'}`,
          };

  return (
    <Link
      to={`/attendance/${subject.id}`}
      className="group block rounded-2xl glass-card-elevated p-4 sm:p-5 shadow-md hover:shadow-xl border border-white/80 transition-all duration-200 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3.5">
        <SubjectGlyph subject={subject} className="shadow-sm shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-body-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              {subject.name}
            </h3>
            <StatusChip tone={status.health} label={status.label} />
          </div>
          <p className="mt-0.5 truncate text-label-sm font-medium text-slate-500">
            {[subject.subjectCode, subject.faculty].filter(Boolean).join(' • ')}
          </p>

          <div className="mt-3 flex items-end justify-between gap-3">
            <span className={cn('text-headline-md font-bold tabular-nums tracking-tight', PERCENT_TEXT[status.health])}>
              {summary.percentage === null ? '—' : `${percentage.toFixed(1)}%`}
            </span>
            <span className="pb-0.5 text-label-md font-semibold text-slate-600 bg-slate-100/80 px-2.5 py-1 rounded-lg border border-slate-200/50">
              {summary.attended} / {summary.conducted}{' '}
              {subject.attendanceCountMode === 'session' ? 'sessions' : 'attended'}
            </span>
          </div>

          <ProgressBar
            className="mt-3"
            value={percentage}
            tone={status.health}
            markerAt={insight.target}
            height={8}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label-sm font-semibold shadow-2xs', footer.badgeClass)}>
              <Icon name={footer.icon} size={14} />
              {footer.text}
            </span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-100/80 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              <Icon name="chevron_right" size={18} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export { formatPercent };

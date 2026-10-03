import { Link } from 'react-router-dom';

import { cn } from '@/lib/cn';
import { SubjectGlyph } from '@/components/ui/SubjectGlyph';
import { Icon } from '@/components/ui/Icon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusChip } from '@/components/ui/chips';
import { formatPercent } from '@/lib/attendance';
import type { SubjectInsight } from '@/hooks/useScheduleData';

const PERCENT_TEXT: Record<string, string> = {
  safe: 'text-ink',
  warning: 'text-warning-700',
  critical: 'text-critical-600',
  no_data: 'text-ink-muted',
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
          tone: 'text-critical-600',
          text:
            recovery.classes > 0
              ? `Needs ${recovery.classes} ${recovery.classes === 1 ? 'class' : 'classes'} to recover`
              : 'Recovery needs more scheduled classes',
        }
      : safeMisses === 0
        ? { icon: 'warning', tone: 'text-warning-700', text: 'Can miss: 0 classes (At Risk)' }
        : {
            icon: subject.attendanceCountMode === 'session' ? 'event_available' : 'calendar_month',
            tone: 'text-ink-secondary',
            text: `Can miss: ${safeMisses} ${safeMisses === 1 ? 'class' : 'classes'}`,
          };

  return (
    <Link
      to={`/attendance/${subject.id}`}
      className="block rounded-card bg-surface p-4 shadow-ambient ring-1 ring-hairline transition active:scale-[0.995]"
    >
      <div className="flex items-start gap-3.5">
        <SubjectGlyph subject={subject} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 truncate text-label-lg text-ink">
              {subject.name}
            </h3>
            <StatusChip tone={status.health} label={status.label} />
          </div>
          <p className="mt-0.5 truncate text-body-sm text-ink-secondary">
            {[subject.subjectCode, subject.faculty].filter(Boolean).join(' • ')}
          </p>

          <div className="mt-2.5 flex items-end justify-between gap-3">
            <span className={cn('text-headline-md   tabular-nums', PERCENT_TEXT[status.health])}>
              {summary.percentage === null ? '—' : `${percentage.toFixed(1)}%`}
            </span>
            <span className="pb-0.5 text-label-md text-ink-secondary">
              {summary.attended} / {summary.conducted}{' '}
              {subject.attendanceCountMode === 'session' ? 'sessions' : 'attended'}
            </span>
          </div>

          <ProgressBar
            className="mt-2.5"
            value={percentage}
            tone={status.health}
            markerAt={insight.target}
            height={7}
          />

          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className={cn('inline-flex items-center gap-1.5 text-label-md', footer.tone)}>
              <Icon name={footer.icon} size={14} />
              {footer.text}
            </span>
            <Icon name="chevron_right" size={18} className="text-ink-muted" />
          </div>
        </div>
      </div>
    </Link>
  );
}

export { formatPercent };

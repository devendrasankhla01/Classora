import { cn } from '@/lib/cn';
import { Icon } from '@/components/ui/Icon';
import { TimelineClassCard } from '@/features/shared/TimelineClassCard';
import { formatTimeLabel } from '@/lib/date';
import type { ClassOccurrence, RecurringSlot } from '@/types/domain';

interface TimelineProps {
  occurrences: ClassOccurrence[];
  /** Recess / lunch blocks for the same weekday, rendered inline. */
  breaks: RecurringSlot[];
  now: Date;
  onModify?: (occurrence: ClassOccurrence) => void;
}

interface TimelineEntry {
  kind: 'class' | 'break';
  startTime: string;
  occurrence?: ClassOccurrence;
  breakSlot?: RecurringSlot;
}

/**
 * Vertical timeline with a time rail. Completed classes get a filled marker,
 * upcoming ones an indigo ring — subtle status, never loud.
 */
export function Timeline({ occurrences, breaks, now, onModify }: TimelineProps) {
  const entries: TimelineEntry[] = [
    ...occurrences.map<TimelineEntry>((occurrence) => ({
      kind: 'class',
      startTime: occurrence.startTime,
      occurrence,
    })),
    ...breaks.map<TimelineEntry>((slot) => ({ kind: 'break', startTime: slot.startTime, breakSlot: slot })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (entries.length === 0) return null;

  return (
    <ol className="relative pl-1 sm:pl-0">
      {entries.map((entry, index) => {
        const isLast = index === entries.length - 1;

        if (entry.kind === 'break' && entry.breakSlot) {
          return (
            <li key={`break-${entry.breakSlot.id}`} className="relative flex gap-2.5 sm:gap-4 py-2">
              <div className="w-12 sm:w-[52px] shrink-0" />
              <div className="relative flex-1 min-w-0">
                <span className="absolute -left-[16px] sm:-left-[23px] top-3 h-2.5 w-2.5 rounded-full bg-surface-sunken ring-4 ring-canvas" />
                <div className="inline-flex items-center gap-2 rounded-pill bg-surface-sunken px-3 py-1.5 sm:px-3.5 sm:py-2 text-[11px] sm:text-[12px] font-semibold text-ink-secondary">
                  <Icon name="local_cafe" size={14} />
                  {entry.breakSlot.label ?? 'Break'}
                </div>
              </div>
            </li>
          );
        }

        const occurrence = entry.occurrence!;
        const finished = new Date(occurrence.endDateTime).getTime() <= now.getTime();
        const inProgress =
          new Date(occurrence.startDateTime).getTime() <= now.getTime() &&
          new Date(occurrence.endDateTime).getTime() > now.getTime();
        const cancelled = occurrence.scheduleStatus === 'cancelled' || occurrence.scheduleStatus === 'not_conducted';

        return (
          <li key={occurrence.id} className="relative flex gap-2.5 sm:gap-4 pb-4">
            <div className="w-12 sm:w-[52px] shrink-0 pt-3.5 sm:pt-4">
              <span className="text-[11px] sm:text-[12.5px] font-bold tabular-nums text-slate-500 block truncate">
                {formatTimeLabel(occurrence.startTime)}
              </span>
            </div>

            <div className="relative flex-1 min-w-0">
              {!isLast ? (
                <span
                  className="absolute bottom-[-16px] left-[-11px] sm:left-[-14px] top-8 w-[2px] bg-black/[0.06]"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  'absolute left-[-16px] sm:left-[-20px] top-[22px] sm:top-[26px] grid h-[12px] w-[12px] sm:h-[13px] sm:w-[13px] place-items-center rounded-full ring-2 sm:ring-4 ring-canvas',
                  cancelled
                    ? 'bg-ink-muted/40'
                    : finished
                      ? 'bg-safe-500'
                      : inProgress
                        ? 'bg-brand-600'
                        : 'border-2 border-brand-500 bg-canvas',
                )}
                aria-hidden
              />
              <TimelineClassCard occurrence={occurrence} now={now} onModify={onModify} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

import { cn } from '@/lib/cn';
import { formatDayNumber, formatWeekdayShort, todayKey } from '@/lib/date';
import type { DateKey } from '@/types/domain';

interface DateStripProps {
  dates: DateKey[];
  value: DateKey;
  onChange: (date: DateKey) => void;
  /** Dates that have at least one class, shown with a dot. */
  activeDates?: Set<DateKey>;
  className?: string;
}

/** Horizontal weekday picker used on the Timetable screen. */
export function DateStrip({ dates, value, onChange, activeDates, className }: DateStripProps) {
  const today = todayKey();

  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
        {dates.map((date) => {
          const selected = date === value;
          const isToday = date === today;
          const hasClasses = activeDates?.has(date) ?? false;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              aria-pressed={selected}
              aria-label={`${formatWeekdayShort(date)} ${formatDayNumber(date)}`}
              className={cn(
                'relative flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[14px] sm:rounded-[18px] py-2 sm:py-2.5 transition-all duration-200 ease-porcelain',
                selected
                  ? 'bg-brand-600 text-white shadow-elevated'
                  : 'bg-surface text-ink-secondary shadow-ambient ring-1 ring-hairline',
              )}
            >
              <span className={cn('text-[10px] sm:text-label-sm font-semibold uppercase tracking-wider', selected ? 'text-white/80' : 'text-ink-muted')}>
                {formatWeekdayShort(date)}
              </span>
              <span className={cn('text-[15px] sm:text-headline-sm font-bold', selected ? 'text-white' : 'text-ink')}>
                {formatDayNumber(date)}
              </span>
              <span
                className={cn(
                  'h-1 w-1 rounded-full',
                  hasClasses
                    ? selected
                      ? 'bg-white/90'
                      : 'bg-brand-500'
                    : 'bg-transparent',
                )}
              />
              {isToday && !selected ? (
                <span className="absolute inset-x-2 bottom-0.5 h-[2px] rounded-full bg-brand-400/60" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

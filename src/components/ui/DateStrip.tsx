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
    <div className={cn('-mx-5 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      <div className="flex min-w-max items-stretch gap-2">
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
                'relative flex w-[58px] flex-col items-center gap-1 rounded-[18px] px-2 pb-2.5 pt-3 transition-all duration-200 ease-porcelain',
                selected
                  ? 'bg-brand-600 text-white shadow-elevated'
                  : 'bg-surface text-ink-secondary shadow-ambient ring-1 ring-black/[0.03]',
              )}
            >
              <span className={cn('text-[11px] font-semibold uppercase tracking-wide', selected ? 'text-white/80' : 'text-ink-muted')}>
                {formatWeekdayShort(date)}
              </span>
              <span className={cn('text-[19px] font-bold leading-none', selected ? 'text-white' : 'text-ink')}>
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
                <span className="absolute inset-x-3 bottom-1 h-[2px] rounded-full bg-brand-400/60" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

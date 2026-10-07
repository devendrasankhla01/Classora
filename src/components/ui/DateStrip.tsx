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
    <div className={cn('w-full overflow-hidden', className)}>
      <div className="flex w-full items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar snap-x py-1 px-0.5">
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
                'relative flex flex-1 min-w-[50px] sm:min-w-[56px] snap-center flex-col items-center justify-center gap-0.5 rounded-[14px] sm:rounded-[18px] py-2 sm:py-2.5 transition-all duration-200',
                selected
                  ? 'bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-700 text-white shadow-[0_4px_14px_rgba(79,70,229,0.4),inset_0_1px_0_rgba(255,255,255,0.3)] scale-[1.03]'
                  : 'bg-white/80 backdrop-blur-md text-ink-secondary border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:bg-white',
              )}
            >
              <span className={cn('text-[10px] sm:text-label-sm font-semibold uppercase tracking-wider', selected ? 'text-white/90' : 'text-ink-muted')}>
                {formatWeekdayShort(date)}
              </span>
              <span className={cn('text-[14px] sm:text-headline-sm font-bold', selected ? 'text-white' : 'text-ink')}>
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
                <span className="absolute inset-x-2 bottom-0.5 h-[2px] rounded-full bg-brand-500" aria-hidden />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

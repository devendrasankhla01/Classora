import { cn } from '@/lib/cn';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'md' | 'sm';
  ariaLabel?: string;
}

/** The pill segmented control from the design (Daily/Weekly, filters). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex w-full items-center gap-1 rounded-pill bg-surface-sunken p-1',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'flex-1 rounded-pill font-semibold transition-all duration-200 ease-porcelain',
              size === 'md' ? 'px-3 py-2.5 text-[13.5px]' : 'px-3 py-2 text-[12.5px]',
              selected
                ? 'bg-surface text-brand-700 shadow-ambient'
                : 'text-ink-secondary hover:text-ink',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

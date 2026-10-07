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
        'flex w-full items-center gap-1 rounded-pill bg-slate-200/70 backdrop-blur-md p-1 border border-slate-300/40 shadow-inner',
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
              size === 'md' ? 'px-3 py-2 text-label-lg' : 'px-3 py-1.5 text-label-md',
              selected
                ? 'bg-gradient-to-b from-white to-slate-50 text-indigo-700 shadow-[0_3px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]'
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

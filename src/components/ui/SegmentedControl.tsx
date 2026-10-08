import { motion } from 'framer-motion';

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

/** The pill segmented control with spring animated pill background slider. */
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
        'relative flex w-full items-center gap-1 rounded-pill bg-slate-200/70 backdrop-blur-md p-1 border border-slate-300/40 shadow-inner',
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <motion.button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            whileTap={{ scale: 0.96 }}
            className={cn(
              'relative z-10 flex-1 rounded-pill font-semibold transition-colors duration-200',
              size === 'md' ? 'px-3 py-2 text-label-lg' : 'px-3 py-1.5 text-label-md',
              selected ? 'text-indigo-700 font-bold' : 'text-ink-secondary hover:text-ink',
            )}
          >
            {selected && (
              <motion.div
                layoutId="segmented-pill-bg"
                transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                className="absolute inset-0 z-[-1] rounded-pill bg-gradient-to-b from-white to-slate-50 shadow-[0_3px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]"
              />
            )}
            {option.label}
          </motion.button>
        );
      })}
    </div>
  );
}

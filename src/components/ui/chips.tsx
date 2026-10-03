import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import type { AttendanceHealth } from '@/lib/attendance';
import { Icon } from './Icon';

export type ChipTone = AttendanceHealth | 'neutral' | 'brand' | 'completed' | 'upcoming' | 'cancelled';

/**
 * Status tints are a 12% wash of the status hue with a deep text tone, exactly
 * as DESIGN.md specifies.
 */
const TONES: Record<ChipTone, string> = {
  safe: 'bg-safe-500/[0.12] text-safe-700',
  warning: 'bg-warning-500/[0.12] text-warning-700',
  critical: 'bg-critical-500/[0.12] text-critical-700',
  no_data: 'bg-surface-sunken text-ink-info',
  neutral: 'bg-surface-sunken text-ink-info',
  brand: 'bg-brand-500/[0.12] text-brand-700',
  completed: 'bg-safe-500/[0.12] text-safe-700',
  upcoming: 'bg-brand-500/[0.12] text-brand-700',
  cancelled: 'bg-surface-sunken text-ink-info',
};

const DOTS: Record<ChipTone, string> = {
  safe: 'bg-safe-500',
  warning: 'bg-warning-500',
  critical: 'bg-critical-500',
  no_data: 'bg-ink-muted',
  neutral: 'bg-ink-muted',
  brand: 'bg-brand-600',
  completed: 'bg-safe-500',
  upcoming: 'bg-brand-600',
  cancelled: 'bg-ink-muted',
};

interface StatusChipProps {
  tone: ChipTone;
  label: string;
  className?: string;
  icon?: string;
  showDot?: boolean;
}

/** Small pill used for Safe / Warning / Critical and class states. */
export function StatusChip({ tone, label, className, icon, showDot = true }: StatusChipProps) {
  return (
    <span
      className={cn(
        // Status pill: 24px tall, 10px horizontal padding, label-sm type.
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-pill px-2.5 text-label-sm',
        TONES[tone],
        className,
      )}
    >
      {icon ? (
        <Icon name={icon} size={13} filled />
      ) : showDot ? (
        <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone])} />
      ) : null}
      {label}
    </span>
  );
}

interface PillProps {
  children: ReactNode;
  className?: string;
  tone?: 'default' | 'muted' | 'brand' | 'danger';
  icon?: string;
}

/** Neutral/structural pill (targets, meta values, counts). */
export function Pill({ children, className, tone = 'default', icon }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-pill px-2.5 text-label-md',
        tone === 'default' && 'bg-surface-sunken text-ink-secondary',
        tone === 'muted' && 'border border-divider bg-white/70 text-ink-secondary',
        tone === 'brand' && 'bg-brand-50 text-brand-700',
        tone === 'danger' && 'bg-critical-50 text-critical-600',
        className,
      )}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
    </span>
  );
}

interface DotProps {
  tone: ChipTone;
  className?: string;
}

export function Dot({ tone, className }: DotProps) {
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', DOTS[tone], className)} />;
}

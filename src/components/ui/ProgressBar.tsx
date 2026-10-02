import { cn } from '@/lib/cn';
import type { AttendanceHealth } from '@/lib/attendance';

const BAR_COLORS: Record<AttendanceHealth, string> = {
  safe: 'bg-safe-500',
  warning: 'bg-warning-500',
  critical: 'bg-critical-500',
  no_data: 'bg-ink-muted',
};

interface ProgressBarProps {
  /** 0–100. */
  value: number;
  tone?: AttendanceHealth;
  className?: string;
  height?: number;
  /** Optional marker line, e.g. the attendance target. */
  markerAt?: number | null;
  animate?: boolean;
}

export function ProgressBar({
  value,
  tone = 'safe',
  className,
  height = 6,
  markerAt = null,
  animate = true,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-pill bg-surface-sunken', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-pill', BAR_COLORS[tone], animate && 'animate-progress-grow origin-left')}
        style={{ width: `${clamped}%` }}
      />
      {markerAt !== null && markerAt > 0 && markerAt < 100 ? (
        <span
          className="absolute top-0 h-full w-[2px] bg-ink/20"
          style={{ left: `${markerAt}%` }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
